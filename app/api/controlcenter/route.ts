import { ConvexHttpClient } from 'convex/browser';
import { NextResponse } from 'next/server';

import dotenv from 'dotenv';

dotenv.config();


export async function POST(request: Request) {
    const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
    const convex = new ConvexHttpClient(CONVEX_URL);

    console.log('db', convex)

    const { text } = await request.json();
    console.log(text);
    return NextResponse.json({ message: 'Trade received', text });
}   