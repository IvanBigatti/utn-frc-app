import Navbar from "./components/Navbar/Navbar";
import LandingLeft from "./components/LandingLeft/LandingLeft";
import StatsPanel from "./components/StatsPanel/StatsPanel";
import "./landing.css";

export default function Home() {
  return (
    <main>
      <Navbar />
      <div className="landing-layout">
        <LandingLeft />
        <StatsPanel />
      </div>
    </main>
  );
}
