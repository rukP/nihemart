"use client"

import { useState } from "react"
import Image from "next/image"
import { Heart, Star, Minus, Plus, Truck, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const productImages = [
  "/woman-in-beige-casual-outfit-sitting-outdoors.png",
  "/woman-in-beige-casual-outfit-standing.png",
  "/beige-casual-outfit-detail-view.png",
  "/beige-casual-outfit-back-view.png",
]

const colorOptions = [
  { name: "Beige", value: "beige", color: "bg-amber-100" },
  { name: "Green", value: "green", color: "bg-green-400" },
  { name: "Blue", value: "blue", color: "bg-blue-400" },
  { name: "Pink", value: "pink", color: "bg-pink-300" },
  { name: "Sage", value: "sage", color: "bg-green-300" },
]

const sizeOptions = ["Small", "Medium", "Large", "Extra Large", "XXL"]

const reviews = [
  {
    id: 1,
    name: "Nicolas Cage",
    avatar: "NC",
    rating: 5,
    date: "3 Days ago",
    title: "Great Product",
    content:
      "There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour.",
  },
  {
    id: 2,
    name: "Sr.Robert Downey",
    avatar: "RD",
    rating: 5,
    date: "5 Days ago",
    title: "The best product in Market",
    content:
      "Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old.",
  },
]

const similarProducts = [
  { id: 1, name: "TDX Sinkers", price: "€675.00", rating: 4.5, image: "/product.png" },
  { id: 2, name: "TDX Sinkers", price: "€675.00", rating: 4.5, image: "/product.png" },
  { id: 3, name: "TDX Sinkers", price: "€675.00", rating: 4.5, image: "/product.png" },
  { id: 4, name: "TDX Sinkers", price: "€675.00", rating: 4.5, image: "/product.png" },
  { id: 5, name: "TDX Sinkers", price: "€675.00", rating: 4.5, image: "/product.png" },
  { id: 6, name: "TDX Sinkers", price: "€675.00", rating: 4.5, image: "/product.png" },
]

export default function ProductPage() {
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedColor, setSelectedColor] = useState("beige")
  const [selectedSize, setSelectedSize] = useState("Medium")
  const [quantity, setQuantity] = useState(1)
  const [isFavorite, setIsFavorite] = useState(false)

  const nextImage = () => {
    setSelectedImage((prev) => (prev + 1) % productImages.length)
  }

  const prevImage = () => {
    setSelectedImage((prev) => (prev - 1 + productImages.length) % productImages.length)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-4">
            <div className="relative aspect-square bg-white rounded-lg overflow-hidden">
              <Image
                src={productImages[selectedImage] || "/placeholder.svg"}
                alt="Product image"
                fill
                className="object-cover"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white"
                onClick={prevImage}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white"
                onClick={nextImage}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {productImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                    selectedImage === index ? "border-orange-500" : "border-gray-200"
                  }`}
                >
                  <Image
                    src={image || "/placeholder.svg"}
                    alt={`Product thumbnail ${index + 1}`}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Embrace Sideboard</h1>
                <p className="text-gray-600 mt-1">Furniture Design Studio</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={isFavorite ? "text-red-500" : "text-gray-400"}
                >
                  <Heart className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
                </Button>
                <Badge variant="secondary">109</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-orange-600">$71.56</span>
                <span className="text-lg text-gray-500 line-through">$71.56</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="ml-1 text-sm font-medium">4.8</span>
                </div>
                <span className="text-sm text-gray-500">67 Reviews</span>
              </div>
              <p className="text-sm text-gray-600">93% of buyers have recommended this.</p>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Choose a Color</Label>
              <div className="flex gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={`w-8 h-8 rounded-full border-2 ${color.color} ${
                      selectedColor === color.value ? "border-orange-500" : "border-gray-300"
                    }`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Choose a Size</Label>
              <div className="flex gap-2 flex-wrap">
                {sizeOptions.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      selectedSize === size
                        ? "border-orange-500 bg-orange-50 text-orange-600"
                        : "border-gray-300 text-gray-700 hover:border-orange-400"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-lg">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-10 w-10"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="px-4 py-2 min-w-[3rem] text-center">{quantity}</span>
                <Button variant="ghost" size="icon" onClick={() => setQuantity(quantity + 1)} className="h-10 w-10">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button className="flex-1 h-12 text-base font-medium bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-md hover:shadow-lg transition-all duration-200">
                Add To Cart
              </Button>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-600">Fast Delivery</p>
                  <p className="text-sm text-gray-600">Enter your location for Delivery</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <RotateCcw className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-600">Return Delivery</p>
                  <p className="text-sm text-gray-600">Can return products within 24 hours of order. Details</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <Tabs defaultValue="reviews" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-8">
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-600 leading-relaxed">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore
                    et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
                    aliquip ex ea commodo consequat.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="mt-8 space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Customers Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-orange-600 mb-2">4.8</div>
                      <div className="flex justify-center mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <p className="text-gray-600">Product Rating</p>
                    </div>
                    <div className="space-y-2">
                      {[
                        { stars: 5, percentage: 70 },
                        { stars: 4, percentage: 15 },
                        { stars: 3, percentage: 10 },
                        { stars: 2, percentage: 3 },
                        { stars: 1, percentage: 2 },
                      ].map((item) => (
                        <div key={item.stars} className="flex items-center gap-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < item.stars ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <Progress value={item.percentage} className="flex-1 h-2" />
                          <span className="text-sm text-gray-600 w-8">{item.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <h3 className="text-xl font-semibold">Reviews</h3>
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar>
                          <AvatarFallback className="bg-orange-100 text-orange-600">{review.avatar}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{review.name}</h4>
                            <span className="text-sm text-gray-500">{review.date}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <h5 className="font-medium mb-2">{review.title}</h5>
                          <p className="text-gray-600 leading-relaxed">{review.content}</p>
                          <div className="flex items-center gap-4 mt-4">
                            <Button variant="ghost" size="sm">
                              👍 Like
                            </Button>
                            <Button variant="ghost" size="sm">
                              Reply
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="text-center">
                  <Button variant="outline">View All Reviews</Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Write a Review</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>What is it like to Product?</Label>
                    <div className="flex gap-1 mt-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-6 w-6 text-gray-300 hover:text-yellow-400 cursor-pointer" />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="review-title">Review Title</Label>
                    <Input id="review-title" placeholder="Great Products" className="mt-2" />
                  </div>
                  <div>
                    <Label htmlFor="review-content">Review Content</Label>
                    <Textarea
                      id="review-content"
                      placeholder="It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout."
                      className="mt-2 min-h-[120px]"
                    />
                  </div>
                  <Button className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-md hover:shadow-lg transition-all duration-200">
                    Submit Review
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-8">Similar Items You Might Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {similarProducts.map((product) => (
              <Card key={product.id} className="group cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="relative aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden">
                    <Image
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-white/80 hover:bg-white">
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                  <h3 className="font-medium text-sm mb-1">{product.name}</h3>
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="font-bold text-orange-600">{product.price}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}