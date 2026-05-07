import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Privacy = () => (
  <div className="app-shell px-5 pt-12 pb-16">
    <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6">
      <ArrowLeft className="h-4 w-4" /> Back
    </Link>
    <h1 className="text-2xl font-extrabold mb-4">Privacy Policy</h1>
    <p className="text-sm text-muted-foreground">Текст готовится.</p>
  </div>
);

export default Privacy;
