import React from "react";
import Image from "next/image";
import { optimizeImageUrl } from "@/lib/utils";

interface ProductItemProps {
  image?: string;
  name: string;
  code: string;
  price: string;
  bgColor?: string;
}

const ProductItem: React.FC<ProductItemProps> = ({
  image,
  name,
  code,
  price,
  bgColor = "bg-gray-100",
}) => (
  <div className="flex items-center gap-3 p-3">
    <div
      className={`w-10 h-10 rounded ${bgColor} flex items-center justify-center overflow-hidden`}
    >
      {image ? (
        <Image
          src={optimizeImageUrl(image, { width: 40, height: 40, quality: 70 })}
          alt={name}
          width={40}
          height={40}
          className="object-cover w-full h-full"
        />
      ) : (
        <div className="w-6 h-6 bg-gray-400 rounded"></div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-gray-900 truncate">{name}</p>
      <p className="text-sm text-gray-500 truncate">{code}</p>
      <p className="font-semibold text-gray-900">{price}</p>
    </div>
  </div>
);

export default ProductItem;