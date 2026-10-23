import { searchFoods } from "@/lib/food-api";
export async function GET(request: Request) {
  return searchFoods(request, "usda");
}
