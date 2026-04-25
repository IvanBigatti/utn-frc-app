import LandingLeft from "./components/LandingLeft/LandingLeft";
import StatsPanel from "./components/StatsPanel/StatsPanel";
import TeamFooter from "./components/TeamFooter/TeamFooter";
import "./landing.css";

export default function Home() {
  return (
    <>
      <div className="landing-layout">
        <LandingLeft />
        <StatsPanel />
      </div>
      <TeamFooter />
    </>
  );
}
