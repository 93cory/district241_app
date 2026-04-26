import "./index.css";
import { Composition } from "remotion";
import { PNPI, PNPI_DURATION, PNPI_FPS } from "./PNPI/PNPI";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PNPI"
        component={PNPI}
        durationInFrames={PNPI_DURATION}
        fps={PNPI_FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
