import type { PortfolioAnalysisResponse } from '../src/types/portfolioAnalysis';
export declare function getAnalyzePortfolioErrorResponse(error: unknown): {
    status: number;
    body: {
        ok: boolean;
        route: "/api/analyze";
        message: string;
    };
};
export declare function analyzePortfolio(payload: unknown): Promise<PortfolioAnalysisResponse>;
