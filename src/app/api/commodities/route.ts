import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
export default async function handler(req, res) {
  const Commodity = await prisma.commodity.findMany();
  res.status(200).json(Commodity);
}
