import { NextResponse } from 'next/server';


const accountIds = [
    0,
]

export async function POST(request: Request) {

    const accountId = accountIds[0];

    return NextResponse.json({ 
        request: request,
        result: 'success',
        accountId: accountId,
    });

}