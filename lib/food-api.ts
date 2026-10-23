import "server-only";
import { requireUser } from "./supabase/server";
import { mapOff, mapUsda, type OffFood, type UsdaFood } from "./foods";
export async function searchFoods(request: Request, provider: "usda" | "off") {
  try {
    await requireUser();
  } catch {
    return Response.json(
      { error: "Sign in to search foods." },
      { status: 401 },
    );
  }
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 100)
    return Response.json(
      { error: "Search for 2–100 characters." },
      { status: 400 },
    );
  const headers = { "Cache-Control": "private, no-store" };
  if (provider === "usda" && !process.env.USDA_API_KEY)
    return Response.json(
      {
        error:
          "USDA lookup is not configured. Add USDA_API_KEY or enter values manually.",
      },
      { status: 503, headers },
    );
  if (provider === "off" && !process.env.OFF_USER_AGENT)
    return Response.json(
      {
        error:
          "Open Food Facts lookup is not configured. Set OFF_USER_AGENT or enter values manually.",
      },
      { status: 503, headers },
    );
  try {
    let response: Response;
    if (provider === "usda") {
      const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
      url.searchParams.set("api_key", process.env.USDA_API_KEY!);
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          pageSize: 15,
          dataType:
            params.get("branded") === "true"
              ? ["Foundation", "SR Legacy", "Branded"]
              : ["Foundation", "SR Legacy"],
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
    } else {
      // Full-text search uses v1; v2's search endpoint only supports filters.
      const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
      url.search = new URLSearchParams({
        search_terms: query,
        search_simple: "1",
        action: "process",
        json: "1",
        page_size: "15",
        fields:
          "code,product_name,brands,nutriments,nutrition_data_per,product_quantity_unit",
      }).toString();
      response = await fetch(url, {
        headers: { "User-Agent": process.env.OFF_USER_AGENT! },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
    }
    if (response.status === 429)
      return Response.json(
        {
          error:
            "This food database has reached its search limit. Wait a minute and try again, or enter macros manually.",
        },
        {
          status: 429,
          headers: {
            ...headers,
            "Retry-After":
              response.headers.get("Retry-After") ??
              (provider === "usda" ? "3600" : "60"),
          },
        },
      );
    if (!response.ok)
      return Response.json(
        {
          error:
            "The food database is unavailable. Try again later or enter macros manually.",
        },
        { status: 502, headers },
      );
    const data = await response.json();
    const results =
      provider === "usda"
        ? (data.foods ?? [])
            .filter((food: UsdaFood) => food.description && food.fdcId)
            .map(mapUsda)
        : (data.products ?? [])
            .filter((food: OffFood) => food.product_name && food.code)
            .map(mapOff);
    return Response.json({ results }, { headers });
  } catch {
    return Response.json(
      {
        error:
          "Could not reach the food database. Check your connection, or enter macros manually.",
      },
      { status: 502, headers },
    );
  }
}
