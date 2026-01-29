"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Heart, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { optimizeImageUrl } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  price: number;
  rating: number;
  reviews: number;
  availability: string;
  image: string;
  isFavorite: boolean;
}

const mockProducts: Product[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: "TDX Sinkers",
  price: 675.0,
  rating: 4.5,
  reviews: 121,
  availability: "5 types of shoes available",
  image: "/product.png",
  isFavorite: false,
}));

const categories = [
  { name: "Kid", count: 18 },
  { name: "Man", count: 12 },
  { name: "Woman", count: 23 },
  { name: "Casual", count: 67 },
  { name: "Sport", count: 34 },
  { name: "Rainbow", count: 12 },
];

const brands = [
  { name: "Adidas", count: 18 },
  { name: "Nike", count: 12 },
  { name: "Jacik & Co", count: 23 },
  { name: "My Shooed", count: 67 },
  { name: "Florida Fox", count: 34 },
];

const ratings = [
  { stars: 4.5, count: 1991 },
  { stars: 4.0, count: 200 },
  { stars: 3.5, count: 300 },
  { stars: 3.0, count: 500 },
];

export default function ProductListingPage() {
  const router = useRouter();
  const [products, setProducts] = useState(mockProducts);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [priceRange, setPriceRange] = useState([0, 200]);
  const [sizeRange, setSizeRange] = useState([5, 10]);
  const [sortBy, setSortBy] = useState("popularity");
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const [showMoreBrands, setShowMoreBrands] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    ratings: true,
    brand: true,
    price: true,
    size: true,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleCardClick = (productId: number) => {
    router.push(`/products/${productId}`);
  };

  const toggleFavorite = (e: React.MouseEvent, productId: number) => {
    e.stopPropagation();
    setProducts(
      products.map((product) =>
        product.id === productId
          ? { ...product, isFavorite: !product.isFavorite }
          : product
      )
    );
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={cn(
          "text-sm",
          i < Math.floor(rating) ? "text-yellow-400" : "text-gray-300"
        )}
      >
        ★
      </span>
    ));
  };

  const FilterContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filters</h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-orange-500 hover:text-orange-600"
        >
          Clear All
        </Button>
      </div>

      <div>
        <button
          type="button"
          onClick={() => toggleSection("category")}
          className="flex items-center justify-between w-full mb-3"
        >
          <h3 className="font-medium">Category</h3>
          {expandedSections.category ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        {expandedSections.category && (
          <div className="space-y-2">
            {categories
              .slice(0, showMoreCategories ? categories.length : 4)
              .map((category) => (
                <div
                  key={category.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={category.name}
                      checked={selectedCategories.includes(category.name)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCategories([
                            ...selectedCategories,
                            category.name,
                          ]);
                        } else {
                          setSelectedCategories(
                            selectedCategories.filter(
                              (c) => c !== category.name
                            )
                          );
                        }
                      }}
                    />
                    <label
                      htmlFor={category.name}
                      className="text-sm cursor-pointer"
                    >
                      {category.name}
                    </label>
                  </div>
                  <span className="text-xs text-gray-500">
                    ({category.count})
                  </span>
                </div>
              ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMoreCategories(!showMoreCategories)}
              className="text-orange-500 hover:text-orange-600 p-0 h-auto"
            >
              {showMoreCategories ? "Show less" : "Show more"}
            </Button>
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => toggleSection("ratings")}
          className="flex items-center justify-between w-full mb-3"
        >
          <h3 className="font-medium">Ratings</h3>
          {expandedSections.ratings ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        {expandedSections.ratings && (
          <div className="space-y-2">
            {ratings.map((rating) => (
              <div
                key={rating.stars}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`rating-${rating.stars}`}
                    checked={selectedRatings.includes(rating.stars)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRatings([...selectedRatings, rating.stars]);
                      } else {
                        setSelectedRatings(
                          selectedRatings.filter((r) => r !== rating.stars)
                        );
                      }
                    }}
                  />
                  <label
                    htmlFor={`rating-${rating.stars}`}
                    className="flex items-center space-x-1 text-sm cursor-pointer"
                  >
                    {renderStars(rating.stars)}
                    <span>{rating.stars} & up</span>
                  </label>
                </div>
                <span className="text-xs text-gray-500">({rating.count})</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => toggleSection("brand")}
          className="flex items-center justify-between w-full mb-3"
        >
          <h3 className="font-medium">Brand</h3>
          {expandedSections.brand ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        {expandedSections.brand && (
          <div className="space-y-2">
            {brands
              .slice(0, showMoreBrands ? brands.length : 4)
              .map((brand) => (
                <div
                  key={brand.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={brand.name}
                      checked={selectedBrands.includes(brand.name)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedBrands([...selectedBrands, brand.name]);
                        } else {
                          setSelectedBrands(
                            selectedBrands.filter((b) => b !== brand.name)
                          );
                        }
                      }}
                    />
                    <label
                      htmlFor={brand.name}
                      className="text-sm cursor-pointer"
                    >
                      {brand.name}
                    </label>
                  </div>
                  <span className="text-xs text-gray-500">({brand.count})</span>
                </div>
              ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMoreBrands(!showMoreBrands)}
              className="text-orange-500 hover:text-orange-600 p-0 h-auto"
            >
              {showMoreBrands ? "Show less" : "Show more"}
            </Button>
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => toggleSection("price")}
          className="flex items-center justify-between w-full mb-3"
        >
          <h3 className="font-medium">Price</h3>
          {expandedSections.price ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        {expandedSections.price && (
          <div className="space-y-4">
            <Slider
              value={priceRange}
              onValueChange={setPriceRange}
              max={200}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>${priceRange[0]}</span>
              <span>${priceRange[1]}</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => toggleSection("size")}
          className="flex items-center justify-between w-full mb-3"
        >
          <h3 className="font-medium">Size</h3>
          {expandedSections.size ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        {expandedSections.size && (
          <div className="space-y-4">
            <Slider
              value={sizeRange}
              onValueChange={setSizeRange}
              min={5}
              max={12}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>{sizeRange[0]}</span>
              <span>{sizeRange[1]}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 sticky top-28">
              <FilterContent />
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600">
                  <span className="text-orange-500 font-medium">
                    Showing 12 Results
                  </span>{" "}
                  from total 230
                </p>
                <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="lg:hidden bg-transparent"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="right"
                    className="w-full sm:w-96 overflow-y-auto"
                  >
                    <SheetHeader className="mb-6">
                      <SheetTitle>Filter Products</SheetTitle>
                    </SheetHeader>
                    <FilterContent />
                  </SheetContent>
                </Sheet>
              </div>

              <div className="flex items-center gap-4">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popularity">Popularity</SelectItem>
                    <SelectItem value="price-low">
                      Price: Low to High
                    </SelectItem>
                    <SelectItem value="price-high">
                      Price: High to Low
                    </SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {products.map((product) => (
                <Card
                  key={product.id}
                  onClick={() => handleCardClick(product.id)}
                  className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white border-0 shadow-md cursor-pointer"
                >
                  <CardContent className="p-5">
                    <div className="relative mb-4">
                      <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl p-4">
                        <Image
                          src={optimizeImageUrl(
                            product.image || "/placeholder.svg",
                            {
                              width: 600,
                              quality: 80,
                            }
                          )}
                          alt={product.name}
                          className="w-full h-40 object-cover rounded-lg"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(e, product.id)}
                        className="absolute top-2 right-2 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
                        aria-label={
                          product.isFavorite
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                        title={
                          product.isFavorite
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                      >
                        <Heart
                          className={cn(
                            "h-4 w-4 transition-colors",
                            product.isFavorite
                              ? "fill-red-500 text-red-500"
                              : "text-gray-400 hover:text-red-400"
                          )}
                        />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {product.availability}
                      </p>

                      <div className="flex items-center space-x-1">
                        {renderStars(product.rating)}
                        <span className="text-sm text-gray-500 ml-2">
                          ({product.reviews})
                        </span>
                      </div>

                      <p className="text-xl font-bold text-gray-900">
                        € {product.price.toFixed(2)}
                      </p>

                      <div className="flex space-x-2 pt-3">
                        <Button
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md hover:shadow-lg transition-all duration-200"
                        >
                          Add To Cart
                        </Button>
                        <Button
                          onClick={(e) => e.stopPropagation()}
                          variant="outline"
                          className="flex-1 border-orange-200 text-orange-500 hover:bg-orange-50 hover:border-orange-300 bg-transparent"
                        >
                          Add Shortlist
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-center items-center flex-wrap gap-2 bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-orange-50 bg-transparent"
              >
                Previous
              </Button>
              {[1, 2, 3, 4, 5, 6, 7].map((page) => (
                <Button
                  key={page}
                  variant={page === 1 ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "w-10 h-10",
                    page === 1
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md"
                      : "hover:bg-orange-50"
                  )}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-orange-50 bg-transparent"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
