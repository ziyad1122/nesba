import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Search } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const categories = [
  { value: "", label: "الكل" },
  { value: "ebook", label: "كتب إلكترونية" },
  { value: "design", label: "تصاميم" },
  { value: "course", label: "دورات" },
  { value: "software", label: "برمجيات" },
  { value: "template", label: "قوالب" },
  { value: "other", label: "أخرى" },
];

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");

  useEffect(() => {
    fetchProducts();
  }, [searchParams]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchParams.get("category")) params.category = searchParams.get("category");
      if (searchParams.get("search")) params.search = searchParams.get("search");

      const response = await axios.get(`${API}/products`, { params });
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching products", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = {};
    if (search) params.search = search;
    if (category) params.category = category;
    setSearchParams(params);
  };

  const handleCategoryChange = (value) => {
    setCategory(value);
    const params = {};
    if (value) params.category = value;
    if (search) params.search = search;
    setSearchParams(params);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="container mx-auto px-6 py-10">
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-slate-900 mb-8">
          تصفح المنتجات
        </h1>

        {/* Search & Filter */}
        <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm" data-testid="search-filter-section">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="ابحث عن منتج..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 pr-12"
                data-testid="search-input"
              />
            </div>

            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              data-testid="category-select"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            <Button
              type="submit"
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-full px-8"
              data-testid="search-button"
            >
              بحث
            </Button>
          </form>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="spinner"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg text-slate-600">لا توجد منتجات</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="products-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
