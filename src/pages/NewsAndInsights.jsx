import React, { useState, useEffect } from "react";
import { MarketingMaterial } from "@/entities/MarketingMaterial";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Rss, Download, FileText, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const FINNHUB_KEY = import.meta.env.VITE_FINHUB_NEWS_API;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const getCached = (category) => {
  try {
    const raw = localStorage.getItem(`finnhub_news_${category}`);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) return null; // expired
    return { data, timestamp };
  } catch {
    return null;
  }
};

const setCache = (category, data) => {
  try {
    localStorage.setItem(
      `finnhub_news_${category}`,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {}
};

const fetchFinnhubNews = async (category) => {
  const res = await fetch(
    `https://finnhub.io/api/v1/news?category=${category}&token=${FINNHUB_KEY}`,
  );
  if (!res.ok) throw new Error(`Finnhub error: ${res.status}`);
  return res.json();
};

const NewsArticleCard = ({ article }) => (
  <Card className="bg-card border border-[#ccab6c]/30 flex flex-col h-full hover:border-[#b38922]/50 transition-colors duration-200">
    {article.image && (
      <img
        src={article.image}
        alt={article.headline}
        className="rounded-t-lg h-40 w-full object-cover"
        onError={(e) => {
          e.target.style.display = "none";
        }}
      />
    )}
    <CardHeader className="pb-2">
      <CardTitle className="text-foreground text-base leading-snug line-clamp-2">
        {article.headline}
      </CardTitle>
      <div className="flex items-center gap-2 mt-1">
        <Badge
          variant="secondary"
          className="bg-muted text-foreground/70 text-xs"
        >
          {article.source}
        </Badge>
        {article.datetime && (
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(article.datetime * 1000), {
              addSuffix: true,
            })}
          </span>
        )}
      </div>
    </CardHeader>
    <CardContent className="flex-grow py-2">
      <p className="text-gold/80 text-sm line-clamp-3">{article.summary}</p>
    </CardContent>
    <CardFooter className="pt-2">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="text-gold-bright hover:text-[#fedea0] ml-auto"
      >
        <a href={article.url} target="_blank" rel="noopener noreferrer">
          Read More <ExternalLink className="w-3 h-3 ml-1.5" />
        </a>
      </Button>
    </CardFooter>
  </Card>
);

const MarketingMaterialCard = ({ material }) => (
  <Card className="bg-card border border-[#ccab6c]/30 flex flex-col h-full hover:border-[#b38922]/50 transition-colors duration-200">
    {material.thumbnail_url && (
      <img
        src={material.thumbnail_url}
        alt={material.title}
        className="rounded-t-lg h-40 object-cover"
      />
    )}
    <CardHeader>
      <CardTitle className="text-foreground text-lg leading-snug">
        {material.title}
      </CardTitle>
      <Badge variant="outline" className="w-fit mt-2 capitalize">
        {material.category.replace("_", " ")}
      </Badge>
    </CardHeader>
    <CardContent className="flex-grow">
      <p className="text-gold/90 text-sm line-clamp-3">
        {material.description}
      </p>
    </CardContent>
    <CardFooter>
      <Button
        asChild
        variant="outline"
        className="w-full text-gold-bright border-[#b38922]/50 hover:bg-[#fedea0] hover:text-black"
      >
        <a href={material.file_url} target="_blank" rel="noopener noreferrer">
          {material.file_url ? "Download" : "Read More"}{" "}
          <Download className="w-3 h-3 ml-2" />
        </a>
      </Button>
    </CardFooter>
  </Card>
);

const NewsSection = ({ category }) => {
  const cached = getCached(category);
  const [articles, setArticles] = useState(cached?.data ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);
  const [cachedAt, setCachedAt] = useState(cached?.timestamp ?? null);

  const load = async (force = false) => {
    // Serve from cache if still fresh and not a forced refresh
    if (!force) {
      const hit = getCached(category);
      if (hit) {
        setArticles(hit.data);
        setCachedAt(hit.timestamp);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFinnhubNews(category);
      const filtered = (data || [])
        .filter((a) => a.headline && a.url)
        .slice(0, 18);
      setCache(category, filtered);
      setArticles(filtered);
      setCachedAt(Date.now());
    } catch (e) {
      console.error(`Finnhub fetch error (${category}):`, e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [category]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card
            key={i}
            className="bg-card border border-[#ccab6c]/20 animate-pulse"
          >
            <div className="h-40 bg-muted rounded-t-lg" />
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/3 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-muted rounded w-full mb-1" />
              <div className="h-3 bg-muted rounded w-5/6" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || articles.length === 0) {
    return (
      <div className="text-center py-16">
        <Rss className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg text-gold/90">Could not load news articles.</p>
        {error && (
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            {error}
          </p>
        )}
        <Button variant="outline" size="sm" className="mt-4" onClick={load}>
          <RefreshCw className="w-3 h-3 mr-2" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {articles.length} articles
          {cachedAt && (
            <span className="ml-2 text-xs text-muted-foreground/60">
              · updated {formatDistanceToNow(new Date(cachedAt), { addSuffix: true })}
            </span>
          )}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => load(true)}
          className="text-gold/70 hover:text-gold-bright"
        >
          <RefreshCw className="w-3 h-3 mr-1.5" /> Refresh
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <NewsArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
};

const VarmaSection = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await MarketingMaterial.list("-created_date");
        setMaterials(data);
      } catch (e) {
        console.error("Could not fetch marketing materials", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-16 text-gold/90">Loading materials...</div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="col-span-full text-center py-16">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg text-gold/90">
          No materials available at this time.
        </p>
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            News & Insights
          </h1>
          <p className="text-gold/90">
            Live market updates and exclusive content from Varma Capital
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-muted border-[#ccab6c]/20">
            <TabsTrigger
              value="general"
              className="data-[state=active]:bg-[#fedea0] data-[state=active]:text-black"
            >
              Finance
            </TabsTrigger>
            <TabsTrigger
              value="crypto"
              className="data-[state=active]:bg-[#fedea0] data-[state=active]:text-black"
            >
              Crypto
            </TabsTrigger>
            <TabsTrigger
              value="varma"
              className="data-[state=active]:bg-[#fedea0] data-[state=active]:text-black"
            >
              Varma Materials
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <NewsSection category="general" />
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
