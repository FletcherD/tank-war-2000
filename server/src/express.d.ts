import { Request, Response } from 'express';

declare namespace Express {
  interface Application {
    use: (path: string, handler: any) => void;
    get: (path: string, handler: (req: Request, res: Response) => any) => void;
    post: (path: string, handler: (req: Request, res: Response) => any) => void;
  }
}