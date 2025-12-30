// Mock data types
export interface Product {
  asin: string;
  title: string;
  price: number;
  rating: number;
  reviews: number;
  category?: string;
}

// Reference product (the seller's product we're trying to find a competitor for)
export const referenceProduct: Product = {
  asin: 'B0XYZ123',
  title: 'ProBrand Steel Bottle 32oz Insulated',
  price: 29.99,
  rating: 4.2,
  reviews: 1247,
  category: 'Sports & Outdoors > Water Bottles',
};

// Mock candidate products
export const mockCandidates: Product[] = [
  {
    asin: 'B0COMP01',
    title: 'HydroFlask 32oz Wide Mouth',
    price: 44.99,
    rating: 4.5,
    reviews: 8932,
  },
  { asin: 'B0COMP02', title: 'Yeti Rambler 26oz', price: 34.99, rating: 4.4, reviews: 5621 },
  { asin: 'B0COMP03', title: 'Generic Water Bottle', price: 8.99, rating: 3.2, reviews: 45 },
  {
    asin: 'B0COMP04',
    title: 'Bottle Cleaning Brush Set',
    price: 12.99,
    rating: 4.6,
    reviews: 3421,
  },
  {
    asin: 'B0COMP05',
    title: 'Replacement Lid for HydroFlask',
    price: 15.99,
    rating: 4.3,
    reviews: 234,
  },
  {
    asin: 'B0COMP06',
    title: 'Water Bottle Carrier Bag with Strap',
    price: 19.99,
    rating: 4.1,
    reviews: 567,
  },
  {
    asin: 'B0COMP07',
    title: 'Stanley Adventure Quencher',
    price: 35.0,
    rating: 4.3,
    reviews: 4102,
  },
  { asin: 'B0COMP08', title: 'CamelBak Chute Mag', price: 24.99, rating: 4.0, reviews: 2891 },
  {
    asin: 'B0COMP09',
    title: 'Nalgene Wide Mouth 32oz',
    price: 18.99,
    rating: 4.2,
    reviews: 1523,
  },
  { asin: 'B0COMP10', title: 'Klean Kanteen Classic', price: 27.99, rating: 4.1, reviews: 987 },
];
