import Image from "next/image";

type PNPILogoVariant = "mark" | "lockup";

interface PNPILogoProps {
  variant?: PNPILogoVariant;
  size?: number;
  className?: string;
  priority?: boolean;
}

export function PNPILogo({
  variant = "mark",
  size = 44,
  className,
  priority = false,
}: PNPILogoProps) {
  const isLockup = variant === "lockup";

  return (
    <Image
      src="/pnpi-logo-officiel.png"
      alt="Logo PNPI - Plateforme Nationale de Pilotage Industriel"
      width={isLockup ? Math.round(size * 1.12) : size}
      height={size}
      priority={priority}
      className={className}
      style={{
        width: isLockup ? Math.round(size * 1.12) : size,
        height: size,
        objectFit: "contain",
      }}
    />
  );
}
