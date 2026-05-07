import React, { useState, useEffect } from "react";
import { InvokeLLM } from "@/integrations/Core";
import { MarketingMaterial } from "@/entities/MarketingMaterial";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Rss, Download, FileText } from "lucide-react";

function parseNewsLLMResponse(result, source) {
  if (!result || typeof result !== "object") {
    return { articles: [], modelError: null };
  }
  const hasList =
    Array.isArray(result.articles) ||
    Array.isArray(result.headlines) ||
    Array.isArray(result.news);
  const modelError =
    typeof result.error === "string" && result.error.trim() && !hasList
      ? result.error.trim()
      : null;
  const raw =
    result.articles ??
    result.headlines ??
    result.news ??
    [];
  if (!Array.isArray(raw)) {
    return { articles: [], modelError: modelError ?? "Unexpected response from news service." };
  }
  const articles = raw
    .map((item) => ({
      title: String(item?.title ?? "").trim(),
      summary: String(item?.summary ?? item?.description ?? "").trim(),
      url: String(item?.url ?? item?.link ?? source.url).trim() || source.url,
    }))
    .filter((a) => a.title);
  return { articles, modelError };
}

const NewsArticleCard = ({ article }) => (
  <Card className="bg-zinc-950 border border-[#ccab6c]/30 flex flex-col h-full hover:border-[#b38922]/50 transition-colors duration-200">
    <CardHeader>
      <CardTitle className="text-white text-lg leading-snug">{article.title}</CardTitle>
    </CardHeader>
    <CardContent className="flex-grow">
      <p className="text-[#ccab6c]/90 text-sm line-clamp-3">{article.summary}</p>
    </CardContent>
    <CardFooter className="flex justify-between items-center">
      <Badge variant="secondary" className="bg-zinc-900 text-zinc-300">{article.source}</Badge>
      <Button asChild variant="ghost" size="sm" className="text-[#fedea0] hover:text-[#fedea0]">
        <a href={article.url} target="_blank" rel="noopener noreferrer">
          Read More <ExternalLink className="w-3 h-3 ml-2" />
        </a>
      </Button>
    </CardFooter>
  </Card>
);

const MarketingMaterialCard = ({ material }) => (
    <Card className="bg-zinc-950 border border-[#ccab6c]/30 flex flex-col h-full hover:border-[#b38922]/50 transition-colors duration-200">
        {material.thumbnail_url && <img src={material.thumbnail_url} alt={material.title} className="rounded-t-lg h-40 object-cover" />}
        <CardHeader>
            <CardTitle className="text-white text-lg leading-snug">{material.title}</CardTitle>
            <Badge variant="outline" className="w-fit mt-2 capitalize">{material.category.replace('_', ' ')}</Badge>
        </CardHeader>
        <CardContent className="flex-grow">
            <p className="text-[#ccab6c]/90 text-sm line-clamp-3">{material.description}</p>
        </CardContent>
        <CardFooter>
            <Button asChild variant="outline" className="w-full text-[#fedea0] border-[#b38922]/50 hover:bg-[#fedea0] hover:text-black">
                <a href={material.file_url} target="_blank" rel="noopener noreferrer">
                    {material.file_url ? 'Download' : 'Read More'} <Download className="w-3 h-3 ml-2" />
                </a>
            </Button>
        </CardFooter>
    </Card>
);


const NewsSection = ({ category }) => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    const newsSources = {
        finance: {
            name: "Reuters Finance",
            url: "https://www.reuters.com/business/finance/",
            topic: "global finance, banking, rates, and markets (Reuters-style coverage)",
        },
        crypto: {
            name: "CoinDesk",
            url: "https://www.coindesk.com/",
            topic: "cryptocurrency, blockchain, regulation, and digital assets (CoinDesk-style coverage)",
        },
    };

    useEffect(() => {
        const fetchNews = async () => {
            setLoading(true);
            setLoadError(null);
            const source = newsSources[category];
            if (!source) {
                setArticles([]);
                setLoading(false);
                return;
            }
            try {
                const result = await InvokeLLM({
                    prompt: [
                        "You cannot browse the web. Do not refuse for lack of browsing.",
                        "Using current public themes from your knowledge (typical headlines in the last months), produce exactly 6 news-style items.",
                        `Topic angle: ${source.topic}. Attribution label for the reader: ${source.name}.`,
                        `Return ONLY valid JSON with this exact top-level shape: {"articles":[{"title":"...","summary":"one sentence","url":"..."}, ...]}.`,
                        `The "articles" key is required (not "headlines" or "news").`,
                        `Each "url" must be a string: use a plausible article path on ${new URL(source.url).hostname} when reasonable, otherwise use exactly: ${source.url}`,
                    ].join("\n"),
                    response_json_schema: {
                        type: "object",
                        properties: {
                            articles: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        title: { type: "string" },
                                        summary: { type: "string" },
                                        url: { type: "string" },
                                    },
                                    required: ["title", "summary", "url"],
                                },
                            },
                        },
                        required: ["articles"],
                    },
                });
                const { articles: parsed, modelError } = parseNewsLLMResponse(result, source);
                if (modelError) {
                    setLoadError(modelError);
                }
                setArticles(parsed.map((article) => ({ ...article, source: source.name })));
            } catch (e) {
                console.error(`Could not fetch news from ${source.name}`, e);
                setArticles([]);
                setLoadError(e?.message ?? "Request failed.");
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, [category]);

    if (loading) {
        return <div className="text-center py-16 text-[#ccab6c]/90">Loading news...</div>;
    }
    
    if (articles.length === 0) {
       return (
         <div className="col-span-full text-center py-16">
            <Rss className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
            <p className="text-lg text-[#ccab6c]/90">Could not load news articles.</p>
            {loadError && (
              <p className="text-sm text-zinc-500 mt-3 max-w-lg mx-auto">{loadError}</p>
            )}
          </div>
       );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article, index) => (
                <NewsArticleCard key={index} article={article} />
            ))}
        </div>
    );
};

const VarmaSection = () => {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMaterials = async () => {
            setLoading(true);
            try {
                const data = await MarketingMaterial.list('-created_date');
                setMaterials(data);
            } catch (e) {
                console.error("Could not fetch marketing materials", e);
            } finally {
                setLoading(false);
            }
        };
        fetchMaterials();
    }, []);

    if (loading) {
        return <div className="text-center py-16 text-[#ccab6c]/90">Loading materials...</div>;
    }
    
    if (materials.length === 0) {
       return (
         <div className="col-span-full text-center py-16">
            <FileText className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
            <p className="text-lg text-[#ccab6c]/90">No materials available at this time.</p>
          </div>
       );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materials.map((material) => (
                <MarketingMaterialCard key={material.id} material={material} />
            ))}
        </div>
    );
};


export default function NewsAndInsights() {
  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">News & Insights</h1>
          <p className="text-[#ccab6c]/90">Market updates and exclusive content from Varma Capital</p>
        </div>

        <Tabs defaultValue="finance" className="space-y-6">
          <TabsList className="bg-zinc-900 border-[#ccab6c]/20">
            <TabsTrigger value="finance" className="data-[state=active]:bg-[#fedea0] data-[state=active]:text-black">
              Finance
            </TabsTrigger>
            <TabsTrigger value="crypto" className="data-[state=active]:bg-[#fedea0] data-[state=active]:text-black">
              Crypto
            </TabsTrigger>
            <TabsTrigger value="varma" className="data-[state=active]:bg-[#fedea0] data-[state=active]:text-black">
              Varma Materials
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="finance">
            <NewsSection category="finance" />
          </TabsContent>
          <TabsContent value="crypto">
            <NewsSection category="crypto" />
          </TabsContent>
          <TabsContent value="varma">
            <VarmaSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}