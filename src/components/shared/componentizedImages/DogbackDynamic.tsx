// Versão mobile da arte do herói — mesma troca feita em DogDynamic: o PNG
// (4096x2888) saiu do base64 no bundle e virou o recorte em WebP no public/.
export interface DogbackDynamicProps {
  className?: string;
}

export const DogbackDynamic = ({ className }: DogbackDynamicProps) => {
  return (
    <img
      src="/images/dogback.webp"
      alt=""
      width={800}
      height={1042}
      decoding="async"
      fetchPriority="high"
      className={className}
    />
  );
};
