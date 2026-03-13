import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import { Store } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SellerStore() {
  const { id } = useParams();
  const [products, setProducts] = useState([]);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSellerProducts();
  }, [id]);

  const fetchSellerProducts = async () => {
    try {
      const response = await axios.get(`${API}/products/seller/${id}`);
      setProducts(response.data);
      if (response.data.length > 0) {
        setSeller({
          id: response.data[0].seller_id,
          name: response.data[0].seller_name,
        });
      }
    } catch (error) {
      console.error("Error fetching seller products", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="container mx-auto px-6 py-10">
        {/* Seller Header */}
        {seller && (
          <div className="bg-white p-8 rounded-2xl shadow-sm mb-10">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-orange-100 rounded-2xl flex items-center justify-center">
                <Store className="w-10 h-10 text-orange-600" />
              </div>
              <div>
                <h1 className="text-3xl font-heading font-bold text-slate-900">
                  متجر {seller.name}
                </h1>
                <p className="text-slate-600">
                  {products.length} منتج
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Products */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="spinner"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg text-slate-600">لا توجد منتجات</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
