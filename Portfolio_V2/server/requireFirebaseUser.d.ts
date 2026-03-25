import type { IncomingMessage } from 'node:http';
import type { DecodedIdToken } from 'firebase-admin/auth';
declare class FirebaseApiAuthError extends Error {
    status: number;
    route: string;
    constructor(message: string, route: string, status?: number);
}
export declare function isFirebaseApiAuthError(error: unknown): error is FirebaseApiAuthError;
export declare function requireFirebaseUserFromAuthorizationHeader(authorizationHeader: string | null | undefined, route: string): Promise<DecodedIdToken>;
export declare function requireFirebaseUserFromRequest(request: Request, route: string): Promise<DecodedIdToken>;
export declare function requireFirebaseUserFromNodeRequest(request: IncomingMessage, route: string): Promise<DecodedIdToken>;
export declare function getFirebaseApiAuthErrorResponse(error: unknown, route: string): {
    status: number;
    body: {
        ok: boolean;
        route: string;
        message: string;
    };
};
export {};
