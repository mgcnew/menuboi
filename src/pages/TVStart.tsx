import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * /tv — Entry point for the TV.
 * Goes straight to the slideshow. All configuration is done in the admin panel.
 */
const TVStart = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/slideshow", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-2xl">Iniciando...</div>
    </div>
  );
};

export default TVStart;
