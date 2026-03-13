import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "./ui/card";
import { Button } from "./ui/button";
import { Star, Download } from "lucide-react";

export default function ProductCard({ product }) {
  return (
    <Card
      className="card-hover overflow-hidden"
      data-testid={`product-card-${product.id}`}
    >
      <div className="product-image-container">
        <img
          src={
            product.cover_image ||
            "https://images.unsplash.com/photo-1633783714412-c74668a14d73?w=400"
          }
          alt={product.title}
          className="w-full h-48 object-cover"
        />
      </div>
      <CardContent className="p-4">
        <h3
          className="font-heading font-semibold text-lg mb-2 line-clamp-1"
          data-testid="product-title"
        >
          {product.title}
        </h3>
        <p className="text-sm text-slate-600 mb-3 line-clamp-2">
          {product.description}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">
              {product.rating?.toFixed(1) || "0.0"}
            </span>
            <span className="text-xs text-slate-500">
              ({product.reviews_count || 0})
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-500">
            <Download className="w-4 h-4" />
            <span className="text-xs">{product.downloads_count || 0}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <div>
          <span
            className="text-2xl font-bold text-emerald-600"
            data-testid="product-price"
          >
            ${product.price}
          </span>
        </div>
        <Link to={`/product/${product.id}`}>
          <Button
            className="bg-orange-600 hover:bg-orange-700 text-white rounded-full"
            data-testid="view-product-button"
          >
            عرض التفاصيل
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
