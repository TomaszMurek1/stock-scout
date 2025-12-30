import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BackToCarousel = () => {
  const navigate = useNavigate();
  
  return (
    <Button
      variant="ghost"
      onClick={() => navigate('/')}
      className="mt-2 mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to Home
    </Button>
  );
};

export default BackToCarousel;
