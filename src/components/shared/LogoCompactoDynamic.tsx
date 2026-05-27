import React from "react";

interface logoProps {
  width: string;
  height: string;
  primaryColor?: string; // Cor principal (antigo 'white')
  secondaryColor?: string; // Cor dos detalhes (antigo '#F7F7F7')
  className?: string; // 1. Adicionado aqui como opcional
}

export function LogoCompactoDynamic({
  width,
  height,
  primaryColor = "white",
  secondaryColor = "#F7F7F7",
  className, // 2. Desestruturado aqui
}: logoProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 43 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className} // 3. Injetado direto na raiz do SVG
    >
      <path
        d="M21.4696 29.0008C18.0412 29.0008 15.2635 26.2232 15.2635 22.7948C15.2635 13.7138 20.1747 5.287 28.0816 0.808584C31.0638 -0.882146 34.8512 0.164496 36.5419 3.14676C38.2326 6.12902 37.186 9.91638 34.2037 11.6071C30.1782 13.8883 27.679 18.1755 27.679 22.7948C27.679 26.2232 24.9014 29.0008 21.473 29.0008H21.4696Z"
        fill={primaryColor}
      />
      <path
        opacity="0.39"
        d="M21.4696 29.0008C18.0412 29.0008 15.2635 26.2232 15.2635 22.7948C15.2635 13.7138 20.1747 5.287 28.0816 0.808584C31.0638 -0.882146 34.8512 0.164496 36.5419 3.14676C38.2326 6.12902 37.186 9.91638 34.2037 11.6071C30.1782 13.8883 27.679 18.1755 27.679 22.7948C27.679 26.2232 24.9014 29.0008 21.473 29.0008H21.4696Z"
        fill="url(#paint0_linear_26_785)"
      />
      <path
        d="M21.4696 29.0008C18.0412 29.0008 15.2635 26.2232 15.2635 22.7948C15.2635 18.1755 12.7643 13.8883 8.7388 11.6071C5.75654 9.91638 4.7099 6.12902 6.40063 3.14676C8.09135 0.164496 11.8754 -0.882146 14.8576 0.808584C22.7645 5.29036 27.6756 13.7138 27.6756 22.7948C27.6756 26.2232 24.898 29.0008 21.4696 29.0008Z"
        fill={primaryColor}
      />
      <path
        d="M29.5207 42C32.6703 42 35.2236 39.4467 35.2236 36.2971C35.2236 33.1475 32.6703 30.5942 29.5207 30.5942C26.3711 30.5942 23.8179 33.1475 23.8179 36.2971C23.8179 39.4467 26.3711 42 29.5207 42Z"
        fill={secondaryColor}
      />
      <path
        d="M13.4184 42C16.568 42 19.1213 39.4467 19.1213 36.2971C19.1213 33.1475 16.568 30.5942 13.4184 30.5942C10.2688 30.5942 7.71558 33.1475 7.71558 36.2971C7.71558 39.4467 10.2688 42 13.4184 42Z"
        fill={secondaryColor}
      />
      <path
        d="M37.2363 28.5546C40.3859 28.5546 42.9392 26.0014 42.9392 22.8518C42.9392 19.7022 40.3859 17.1489 37.2363 17.1489C34.0867 17.1489 31.5334 19.7022 31.5334 22.8518C31.5334 26.0014 34.0867 28.5546 37.2363 28.5546Z"
        fill={secondaryColor}
      />
      <path
        d="M5.70286 28.5546C8.85246 28.5546 11.4057 26.0014 11.4057 22.8518C11.4057 19.7022 8.85246 17.1489 5.70286 17.1489C2.55326 17.1489 0 19.7022 0 22.8518C0 26.0014 2.55326 28.5546 5.70286 28.5546Z"
        fill={secondaryColor}
      />
      <defs>
        <linearGradient
          id="paint0_linear_26_785"
          x1="15.2635"
          y1="14.5022"
          x2="37.347"
          y2="14.5022"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={primaryColor} stopOpacity={0} />
          <stop offset="1" stopColor={primaryColor} />
        </linearGradient>
      </defs>
    </svg>
  );
}