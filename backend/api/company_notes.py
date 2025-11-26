from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database.base import get_db
from database.company import Company
from database.company_note import CompanyNote
from database.user import User
from services.auth.auth import get_current_user
from schemas.company_note_schemas import CompanyNoteCreate, CompanyNoteUpdate, CompanyNoteResponse

router = APIRouter()

def get_company_by_ticker(db: Session, ticker: str) -> Company:
    company = db.query(Company).filter(Company.ticker == ticker.upper()).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ticker {ticker} not found"
        )
    return company

def map_note_to_schema(note: CompanyNote, ticker: str) -> CompanyNoteResponse:
    next_catalyst_str = None
    if note.next_catalyst and isinstance(note.next_catalyst, dict):
        next_catalyst_str = note.next_catalyst.get("event")
    elif note.next_catalyst and isinstance(note.next_catalyst, str):
         next_catalyst_str = note.next_catalyst

    return CompanyNoteResponse(
        id=note.id,
        ticker=ticker,
        title=note.notes, # Mapping 'notes' to 'title'
        research_status=note.research_status,
        sentiment=note.sentiment_trend,
        thesis=note.investment_thesis,
        risk_factors=note.risk_factors,
        target_price_low=float(note.intrinsic_value_low) if note.intrinsic_value_low else None,
        target_price_high=float(note.intrinsic_value_high) if note.intrinsic_value_high else None,
        next_catalyst=next_catalyst_str,
        tags=note.tags or [],
        updated_at=note.updated_at
    )

@router.get("/{ticker}", response_model=List[CompanyNoteResponse])
def get_company_notes(
    ticker: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    company = get_company_by_ticker(db, ticker)
    
    notes = (
        db.query(CompanyNote)
        .filter(CompanyNote.user_id == current_user.id, CompanyNote.company_id == company.company_id)
        .order_by(CompanyNote.updated_at.desc())
        .all()
    )

    return [map_note_to_schema(note, company.ticker) for note in notes]

@router.post("/{ticker}", response_model=CompanyNoteResponse)
def create_company_note(
    ticker: str,
    note_in: CompanyNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    company = get_company_by_ticker(db, ticker)
    
    # Prepare data
    next_catalyst_json = {"event": note_in.next_catalyst} if note_in.next_catalyst else None
    
    # Always create new
    note = CompanyNote(
        user_id=current_user.id,
        company_id=company.company_id,
        notes=note_in.title,
        research_status=note_in.research_status,
        sentiment_trend=note_in.sentiment,
        investment_thesis=note_in.thesis,
        risk_factors=note_in.risk_factors,
        intrinsic_value_low=note_in.target_price_low,
        intrinsic_value_high=note_in.target_price_high,
        next_catalyst=next_catalyst_json,
        tags=note_in.tags
    )
    db.add(note)
    
    db.commit()
    db.refresh(note)
    
    return map_note_to_schema(note, company.ticker)

@router.put("/note/{note_id}", response_model=CompanyNoteResponse)
def update_company_note(
    note_id: int,
    note_in: CompanyNoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    note = db.query(CompanyNote).filter(CompanyNote.id == note_id, CompanyNote.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    company = db.query(Company).filter(Company.company_id == note.company_id).first()

    next_catalyst_json = {"event": note_in.next_catalyst} if note_in.next_catalyst else None
    
    note.notes = note_in.title
    note.research_status = note_in.research_status
    note.sentiment_trend = note_in.sentiment
    note.investment_thesis = note_in.thesis
    note.risk_factors = note_in.risk_factors
    note.intrinsic_value_low = note_in.target_price_low
    note.intrinsic_value_high = note_in.target_price_high
    note.next_catalyst = next_catalyst_json
    note.tags = note_in.tags
    
    db.commit()
    db.refresh(note)
    
    return map_note_to_schema(note, company.ticker)

@router.delete("/note/{note_id}")
def delete_company_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    note = db.query(CompanyNote).filter(CompanyNote.id == note_id, CompanyNote.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    db.delete(note)
    db.commit()
    return {"message": "Note deleted successfully"}