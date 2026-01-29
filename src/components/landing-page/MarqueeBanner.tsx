import React from 'react';

interface MarqueeContentProps {
  children: React.ReactNode;
}

const MarqueeContent: React.FC<MarqueeContentProps> = ({ children }) => {
  const items: React.ReactNode[] = Array.from({ length: 2 }).fill(children) as React.ReactNode[];

  return (
    <div className="flex">
      {items.map((item, index) => (
        <div key={index} className="px-6 py-4 text-center text-white text-xl font-bold whitespace-nowrap">
          {item}
        </div>
      ))}
    </div>
  );
};

const MarqueeBanner: React.FC = () => {
  const textContent = "Exceptional Support, Sustainable Solutions";

  return (
    <section className="relative w-full py-16 overflow-hidden hidden md:block">
      <div className="bg-[#f97316] h-20 transform -skew-y-2">
        <div className="transform skew-y-2">
          <div className="relative flex overflow-hidden">
            <div className="text-center w-full flex items-center justify-center -skew-y-2">
              <MarqueeContent>{textContent}</MarqueeContent>
            </div>
            {/* <div className="absolute top-0 animate-arquee" aria-hidden="true">
              <MarqueeContent>{textContent}</MarqueeContent>
            </div> */}
          </div>
        </div>
      </div>
      <div className="bg-[#38bdf8] transform h-20 skew-y-2 mt-2">
        <div className="transform -skew-y-2">
          <div className="relative flex overflow-hidden">
            <div className="text-center w-full flex items-center justify-center skew-y-2">
              <MarqueeContent>{textContent}</MarqueeContent>
            </div>
            {/* <div className="absolute top-0 animate-arquee" aria-hidden="true">
              <MarqueeContent>{textContent}</MarqueeContent>
            </div> */}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MarqueeBanner;