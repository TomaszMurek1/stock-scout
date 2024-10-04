import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom"; // Assuming you're using React Router

const CallToActions = () => (
  <section className="text-center">
    <h2 className="text-3xl font-bold mb-4 text-gray-800">Ready to Start?</h2>
    <p className="text-xl text-gray-600 mb-6">
      Choose a scanning scenario above or learn more about our services.
    </p>
    <Button
      component={Link}
      to="/about"
      className="bg-gray-800 text-white hover:bg-gray-700"
    >
      Learn More
    </Button>
  </section>
);

export default CallToActions;
