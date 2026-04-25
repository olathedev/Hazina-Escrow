/**
 * MarketService handles external market data from CoinGecko
 * and provides deep links for manual data verification on Stellar.Expert.
 */
export class MarketService {
    private static readonly COINGECKO_BASE = "https://api.coingecko.com/api/v3";

  /**
     * Fetches the current USD price for a given asset from CoinGecko.
     * Includes error handling and optional API key support.
     */
  static async getPrice(coinId: string = "stellar"): Promise<number | null> {
        try {
                const apiKey = process.env.COINGECKO_API_KEY;
                const headers = apiKey ? { "x-cg-demo-api-key": apiKey } : {};

          const response = await fetch(
                    `${this.COINGECKO_BASE}/simple/price?ids=${coinId}&vs_currencies=usd`,
            { headers }
                  );
                const data = await response.json() as any;
                return data[coinId]?.usd || null;
        } catch (error) {
                console.error("MarketService Error:", error);
                return null;
        }
  }

  /**
     * Generates a clickable link to Stellar.Expert for a specific asset.
     */
  static getExplorerLink(assetCode: string, issuer?: string): string {
        const code = assetCode.toUpperCase();
        if (code === "XLM") {
                return "https://stellar.expert/explorer/public/asset/XLM";
        }
        return `https://stellar.expert/explorer/public/asset/${code}${issuer ? "-" + issuer : ""}`;
  }

  /**
     * Fetches market metrics (volume, change) for broader synthesis correlation.
     */
  static async getMarketMetrics(coinId: string = "stellar"): Promise<any> {
        try {
                const apiKey = process.env.COINGECKO_API_KEY;
                const headers = apiKey ? { "x-cg-demo-api-key": apiKey } : {};

          const response = await fetch(
                    `${this.COINGECKO_BASE}/coins/${coinId}?localization=false&tickers=false&market_data=true`,
            { headers }
                  );
                const data = await response.json() as any;
                return {
                          price: data.market_data?.current_price?.usd,
                          volume24h: data.market_data?.total_volume?.usd,
                          change24h: data.market_data?.price_change_percentage_24h
                };
        } catch {
                return null;
        }
  }
}
