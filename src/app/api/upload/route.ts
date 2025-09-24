import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { genAI } from '@/lib/gemini';

const execFileAsync = promisify(execFile);
const ffmpegPath = "C:\\ffmpeg\\bin\\ffmpeg.exe";
const mediaInfoPath = "C:\\MediaInfo_CLI_25.07_Windows_x64\\mediainfo.exe";
const bwfEditPath = "C:\\BWFMetaEdit_CLI_25.04.1_Windows_x64\\bwfmetaedit.exe";
const mediaConchPath = "C:\\MediaConch_CLI_25.04_Windows_x64\\mediaconch.exe";

// Define the structure for the AI analysis result
interface AiAnalysisResult {
  transcription: string;
  summary: string;
  speakers: string[];
  tags: string[];
}

// Helper functions for external tools
async function convertToMp3(inputPath: string, outputPath: string): Promise<void> { try { console.log(`Converting ${inputPath} to ${outputPath}...`); const { stderr } = await execFileAsync(ffmpegPath, ['-i', inputPath, outputPath]); if (stderr && !stderr.includes('ffmpeg version')) { console.error('FFmpeg stderr:', stderr); } console.log('Conversion successful.'); } catch (error) { console.error('Error during FFmpeg conversion:', error); throw new Error('Failed to convert file to MP3.'); } }
async function getMediaInfo(filePath: string): Promise<unknown> { try { console.log(`Getting MediaInfo for ${filePath}...`); const { stdout } = await execFileAsync(mediaInfoPath, ['--Output=JSON', filePath]); console.log('MediaInfo analysis successful.'); return JSON.parse(stdout); } catch (error: unknown) { console.error('Error during MediaInfo analysis:', error); if (error instanceof Error) { throw new Error(`Failed to analyze file with MediaInfo: ${error.message}`); } throw new Error('Failed to analyze file with MediaInfo.'); } }
async function getBwfInfo(filePath: string): Promise<string> { try { console.log(`Getting BWF Info for ${filePath}...`); const { stdout } = await execFileAsync(bwfEditPath, ['--out-tech', filePath]); console.log('BWF Info analysis successful.'); return stdout; } catch (error: unknown) { console.error('Error during BWF Info analysis:', error); return "File is not a BWF file or analysis failed."; } }
async function getMediaConchReport(filePath: string): Promise<string> { try { console.log(`Getting MediaConch report for ${filePath}...`); const { stdout } = await execFileAsync(mediaConchPath, ['-f', filePath]); console.log('MediaConch analysis successful.'); return stdout; } catch (error: unknown) { console.error('Error during MediaConch analysis:', error); return "Could not generate MediaConch report."; } }

// Helper function for AI Analysis
async function getAiAnalysis(filePath: string): Promise<AiAnalysisResult> {
    try {
        console.log(`Starting AI analysis for ${filePath}...`);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Analiza el siguiente archivo de audio y proporciona los resultados en un objeto JSON con la siguiente estructura:
            {
              "transcription": "La transcripción completa del audio...",
              "summary": "Un resumen conciso del contenido...",
              "speakers": ["Nombre Ponente 1", "Nombre Ponente 2", "..."],
              "tags": ["palabra clave 1", "palabra clave 2", "..."]
            }
            Si no puedes identificar a los ponentes, devuelve un array vacío.
        `;

        const audioFilePart = {
            inlineData: {
                data: Buffer.from(await fs.readFile(filePath)).toString("base64"),
                mimeType: "audio/mpeg",
            },
        };

        const result = await model.generateContent([prompt, audioFilePart]);
        const response = await result.response;
        const text = response.text();
        
        const jsonString = text.replace(/^```json\n/, '').replace(/\n```$/, '');
        
        console.log('AI analysis successful.');
        return JSON.parse(jsonString);

    } catch (error: unknown) {
        console.error('Error during AI analysis:', error);
        if (error instanceof Error) {
            throw new Error(`Failed to analyze file with AI: ${error.message}`);
        }
        throw new Error('Failed to analyze file with AI.');
    }
}

export async function POST(request: Request) {
  let processedFilePath: string | null = null;
  let originalFilePath: string | null = null;
  let bwfInfo: string | null = null;
  let mediaConchReport: string | null = null;
  let aiAnalysis: AiAnalysisResult | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'tmp', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    originalFilePath = path.join(uploadDir, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(originalFilePath, buffer);
    console.log(`File saved to: ${originalFilePath}`);

    processedFilePath = originalFilePath;
    let converted = false;

    const fileType = file.type;
    const isWav = fileType === 'audio/wav' || fileType === 'audio/x-wav';

    if (isWav) {
        bwfInfo = await getBwfInfo(originalFilePath);
    }

    const isVideo = fileType.startsWith('video/');
    const isAudio = fileType.startsWith('audio/');
    const isMp3 = fileType === 'audio/mpeg';

    if (isVideo || (isAudio && !isMp3)) {
        const parsedPath = path.parse(originalFilePath);
        const mp3FileName = `${parsedPath.name}.mp3`;
        const mp3FilePath = path.join(uploadDir, mp3FileName);

        await convertToMp3(originalFilePath, mp3FilePath);
        
        processedFilePath = mp3FilePath;
        converted = true;

        if (originalFilePath !== processedFilePath) {
             await fs.unlink(originalFilePath);
             console.log(`Original file ${originalFilePath} deleted.`);
        }
    }

    const mediaInfo = await getMediaInfo(processedFilePath);
    mediaConchReport = await getMediaConchReport(processedFilePath);

    const isProcessable = file.type.startsWith('audio/') || file.type.startsWith('video/');
    if(isProcessable) {
        aiAnalysis = await getAiAnalysis(processedFilePath);
    }

    await fs.unlink(processedFilePath);
    console.log(`Processed file ${processedFilePath} deleted.`);


    return NextResponse.json({
      success: true, 
      fileName: path.basename(processedFilePath),
      converted: converted,
      mediaInfo: mediaInfo,
      bwfInfo: bwfInfo,
      mediaConchReport: mediaConchReport,
      aiAnalysis: aiAnalysis
    });

  } catch (error) {
    console.error('Upload error:', error);
    if (processedFilePath) {
        try {
            await fs.access(processedFilePath);
            await fs.unlink(processedFilePath);
            console.log(`Cleaned up ${processedFilePath} after error.`);
        } catch {
            // Ignore if cleanup fails
        }
    }
    const errorMessage = error instanceof Error ? error.message : 'Error processing file.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}