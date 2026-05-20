import { NextResponse } from 'next/server';
import { uploadToS3 } from '@/lib/aws';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadToS3(buffer, file.name, file.type);

    return NextResponse.json({ 
      success: true, 
      key: result.$metadata.requestId,
      url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/resumes/${file.name}`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
