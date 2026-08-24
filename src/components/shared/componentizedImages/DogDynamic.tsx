import React from "react";

export interface DogDynamicProps {
  width: string;
  height: string;
  className?: string;
}

export const DogDynamic = ({ width, height, className }: DogDynamicProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      width={width}
      height={height}
      viewBox="55.674418604651166 0 445.3953488372093 515.6666666666666"
      fill="none"
      className={className}
    >
      <rect width="684" height="595" fill="url(#pattern0_5_242)" />
      <defs>
        <pattern
          id="pattern0_5_242"
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use
            xlinkHref="#image0_5_242"
            transform="matrix(0.000699652 0 0 0.000803189 -1.81932 -0.344538)"
          />
        </pattern>
        <image
          id="image0_5_242"
          width="4096"
          height="1674"
          preserveAspectRatio="none"
          xlinkHref="/images/dog.png"
        />
      </defs>
    </svg>
  );
};
