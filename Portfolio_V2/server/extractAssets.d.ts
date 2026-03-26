import type { ExtractAssetsResponse } from '../src/types/extractAssets';
export declare function getExtractAssetsErrorResponse(error: unknown): {
    status: number;
    body: {
        ok: boolean;
        route: "/api/extract-assets";
        message: string;
    };
};
export declare function extractAssetsFromScreenshot(payload: unknown): Promise<ExtractAssetsResponse>;
