import React from "react";
import ProductItem from "@/components/admin/ProductItem";
import Link from "next/link";

interface TopProduct {
  id: string;
  name: string;
  main_image_url?: string;
  order_count: number;
  price: number;
}

interface TopProductsSectionProps {
  products: TopProduct[];
  isLoading: boolean;
}

export const TopProductsSection: React.FC<TopProductsSectionProps> = ({
  products,
  isLoading,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Top Products</h3>
        <Link className="text-sm text-blue-500" href="/admin/products">
          All product
        </Link>
      </div>
      <div>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="p-4 border-b border-gray-100 animate-pulse"
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : products.length > 0 ? (
          products.map((product, index) => (
            <ProductItem
              key={product.id || index}
              image={product.main_image_url}
              name={product.name}
              code={`Sold: ${product.order_count}`}
              price={`RWF ${product.price.toLocaleString()}`}
              bgColor={
                index % 4 === 0
                  ? "bg-blue-100"
                  : index % 4 === 1
                    ? "bg-gray-100"
                    : index % 4 === 2
                      ? "bg-black"
                      : "bg-red-100"
              }
            />
          ))
        ) : (
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm">No products found</p>
          </div>
        )}
      </div>
    </div>
  );
};
