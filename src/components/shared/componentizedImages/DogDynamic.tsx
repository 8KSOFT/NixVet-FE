// Arte do herói da landing. Era um SVG com o PNG inteiro (4096x1674) embutido
// em base64 dentro do bundle — 1,5 MB de JS para uma imagem exibida a 640 px.
// Agora é o recorte já renderizado, em WebP, servido como arquivo estático.
export interface DogDynamicProps {
  className?: string;
}

export const DogDynamic = ({ className }: DogDynamicProps) => {
  return (
    <img
      src="/images/dog.webp"
      alt=""
      width={1280}
      height={1482}
      decoding="async"
      fetchPriority="high"
      className={className}
    />
  );
};
