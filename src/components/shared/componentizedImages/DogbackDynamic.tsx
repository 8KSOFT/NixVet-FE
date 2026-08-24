interface DogbackDynamicProps {
  width: string;
  height: string;
  className?: string;
}

export const DogbackDynamic = ({
  width,
  height,
  className,
}: DogbackDynamicProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      width={width}
      height={height}
      viewBox="757.1830985915493 182.88 608.4507042253521 792.48"
      fill="none"
      className={className}
    >
      <rect
        x="-55"
        y="-132"
        width="1628.19"
        height="1148"
        fill="url(#pattern0_13_586)"
      />
      <defs>
        <pattern
          id="pattern0_13_586"
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use
            xlinkHref="#image0_13_586"
            transform="scale(0.000244141 0.00034626)"
          />
        </pattern>
        <image
          id="image0_13_586"
          width="4096"
          height="2888"
          preserveAspectRatio="none"
          xlinkHref="/images/dog-back.png"
        />
      </defs>
    </svg>
  );
};
