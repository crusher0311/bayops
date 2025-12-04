import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

interface VehicleInfo {
  year: number;
  make: string;
  model: string;
  mileage?: number | null;
}

interface JobInfo {
  name: string;
  description?: string;
  lineItems: Array<{
    type: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}

interface RepairOrderContext {
  vehicle: VehicleInfo;
  jobs: JobInfo[];
  notes?: string;
  customerName?: string;
}

export async function generateServiceDescription(
  job: JobInfo,
  vehicle: VehicleInfo
): Promise<string> {
  const prompt = `You are an experienced automotive service advisor. Generate a clear, professional, and customer-friendly description for this repair service.

Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.mileage ? ` with ${vehicle.mileage.toLocaleString()} miles` : ''}

Service: ${job.name}
${job.description ? `Technical Notes: ${job.description}` : ''}

Line Items:
${job.lineItems.map(item => `- ${item.description} (${item.type})`).join('\n')}

Write a 2-3 sentence description that:
1. Explains what the service involves in simple terms
2. Mentions why it's important for the vehicle
3. Uses professional but accessible language

Do not include pricing. Do not use bullet points. Write in a conversational tone.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 200,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content?.trim() || "";
}

export async function generateAuthorizationRequest(
  context: RepairOrderContext
): Promise<string> {
  const totalEstimate = context.jobs.reduce((total, job) => {
    return total + job.lineItems.reduce((jobTotal, item) => {
      return jobTotal + (item.unitPrice * item.quantity);
    }, 0);
  }, 0);

  const prompt = `You are an experienced automotive service advisor. Write a professional authorization request message for a customer.

Customer: ${context.customerName || 'Valued Customer'}
Vehicle: ${context.vehicle.year} ${context.vehicle.make} ${context.vehicle.model}${context.vehicle.mileage ? ` (${context.vehicle.mileage.toLocaleString()} miles)` : ''}

Recommended Services:
${context.jobs.map(job => {
  const jobTotal = job.lineItems.reduce((t, i) => t + (i.unitPrice * i.quantity), 0);
  return `- ${job.name}: $${jobTotal.toFixed(2)}`;
}).join('\n')}

Total Estimate: $${totalEstimate.toFixed(2)}
${context.notes ? `\nAdditional Notes: ${context.notes}` : ''}

Write a professional message that:
1. Greets the customer by name
2. Summarizes the recommended services clearly
3. Explains the benefits of each service briefly
4. Mentions the total estimate
5. Asks for their authorization to proceed
6. Provides contact information placeholder

Keep the tone friendly, professional, and not pushy. The message should be 150-200 words.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 400,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content?.trim() || "";
}

interface DiagnosticSummaryResult {
  summary: string;
  possibleCauses: string[];
  recommendedActions: string[];
}

export async function generateDiagnosticSummary(
  symptoms: string,
  vehicle: VehicleInfo,
  dtcCodes?: string[]
): Promise<DiagnosticSummaryResult> {
  const defaultResult: DiagnosticSummaryResult = {
    summary: "Unable to generate diagnostic summary. Please try again.",
    possibleCauses: [],
    recommendedActions: [],
  };

  try {
    const prompt = `You are an experienced automotive diagnostic technician. Analyze the following vehicle symptoms and provide a diagnostic summary.

Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.mileage ? ` with ${vehicle.mileage.toLocaleString()} miles` : ''}

Customer Concerns/Symptoms:
${symptoms}

${dtcCodes && dtcCodes.length > 0 ? `Diagnostic Trouble Codes (DTCs): ${dtcCodes.join(', ')}` : ''}

Provide your analysis in the following JSON format:
{
  "summary": "A brief 2-3 sentence summary of the likely issue",
  "possibleCauses": ["cause 1", "cause 2", "cause 3"],
  "recommendedActions": ["action 1", "action 2", "action 3"]
}

Base your analysis on common issues for this vehicle make/model/year. Be specific but not overly technical. Limit to 3-5 possible causes and recommended actions.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : defaultResult.summary,
      possibleCauses: Array.isArray(parsed.possibleCauses) ? parsed.possibleCauses.filter((c: unknown) => typeof c === 'string') : [],
      recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions.filter((a: unknown) => typeof a === 'string') : [],
    };
  } catch (error) {
    console.error('AI diagnostic summary error:', error);
    return defaultResult;
  }
}

interface ServiceRecommendation {
  service: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

interface ServiceRecommendationResult {
  recommendations: ServiceRecommendation[];
}

export async function generateServiceRecommendation(
  vehicle: VehicleInfo,
  serviceHistory?: string[]
): Promise<ServiceRecommendationResult> {
  const defaultResult: ServiceRecommendationResult = { recommendations: [] };

  try {
    const prompt = `You are an experienced automotive service advisor. Based on the vehicle information, suggest maintenance services that may be due or recommended.

Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}
Mileage: ${vehicle.mileage ? vehicle.mileage.toLocaleString() + ' miles' : 'Unknown'}

${serviceHistory && serviceHistory.length > 0 ? `Recent Service History:\n${serviceHistory.join('\n')}` : 'No recent service history available.'}

Provide service recommendations in the following JSON format:
{
  "recommendations": [
    {
      "service": "Service name",
      "priority": "high|medium|low",
      "reason": "Brief explanation why this service is recommended"
    }
  ]
}

Consider:
- Typical maintenance intervals for this vehicle
- Common issues for this make/model
- Mileage-based service recommendations
- Seasonal considerations

Provide 3-5 recommendations sorted by priority.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    if (!Array.isArray(parsed.recommendations)) {
      return defaultResult;
    }

    const validPriorities = ['high', 'medium', 'low'];
    const recommendations = parsed.recommendations
      .filter((r: unknown): r is Record<string, unknown> => 
        typeof r === 'object' && r !== null &&
        typeof (r as any).service === 'string' &&
        typeof (r as any).reason === 'string' &&
        validPriorities.includes((r as any).priority)
      )
      .map((r: Record<string, unknown>) => ({
        service: r.service as string,
        priority: r.priority as 'high' | 'medium' | 'low',
        reason: r.reason as string,
      }));

    return { recommendations };
  } catch (error) {
    console.error('AI service recommendations error:', error);
    return defaultResult;
  }
}

export async function improveJobDescription(
  currentDescription: string,
  jobName: string,
  vehicle: VehicleInfo
): Promise<string> {
  const prompt = `You are an experienced automotive service advisor. Improve this job description to be more professional and customer-friendly.

Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}
Job: ${jobName}
Current Description: ${currentDescription || '(no description provided)'}

Rewrite this description to be:
1. Clear and easy to understand for non-technical customers
2. Professional in tone
3. Specific to the vehicle when relevant
4. 2-3 sentences maximum

If no description was provided, write a new one based on the job name.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 150,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content?.trim() || currentDescription;
}

// ==========================================
// DVI (Digital Vehicle Inspection) AI Functions
// ==========================================

interface InspectionItemContext {
  itemLabel: string;
  category: string;
  status: 'GREEN' | 'YELLOW' | 'RED';
  techNotes?: string;
}

interface InspectionDraftResult {
  finding: string;
  recommendation: string;
}

export async function generateInspectionFinding(
  item: InspectionItemContext,
  vehicle: VehicleInfo,
  techNotes?: string
): Promise<InspectionDraftResult> {
  const statusDescriptions = {
    GREEN: 'passed inspection / good condition',
    YELLOW: 'needs attention soon / shows wear',
    RED: 'requires immediate attention / safety concern'
  };

  const prompt = `You are an experienced automotive technician writing an inspection report. Generate professional findings and recommendations for this inspection item.

Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.mileage ? ` with ${vehicle.mileage.toLocaleString()} miles` : ''}

Inspection Item: ${item.itemLabel}
Category: ${item.category}
Status: ${item.status} (${statusDescriptions[item.status]})
${techNotes ? `Technician's Notes: ${techNotes}` : ''}

Write a response in JSON format:
{
  "finding": "1-2 sentences describing what was observed during inspection. Be specific and professional.",
  "recommendation": "${item.status === 'GREEN' ? 'A brief statement that this item is in good condition. Keep it short.' : 'Specific recommended action for the customer. Explain why this matters for safety/reliability.'}"
}

Guidelines:
- Be professional but avoid overly technical jargon
- For GREEN items, keep recommendations brief (e.g., "Continue regular maintenance")
- For YELLOW items, indicate timeline (e.g., "recommend service within 30-60 days")
- For RED items, emphasize urgency and safety implications
- Be specific to the ${vehicle.year} ${vehicle.make} when relevant`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.6,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    return {
      finding: typeof parsed.finding === 'string' ? parsed.finding : '',
      recommendation: typeof parsed.recommendation === 'string' ? parsed.recommendation : '',
    };
  } catch (error) {
    console.error('AI inspection finding error:', error);
    return { finding: '', recommendation: '' };
  }
}

export async function generateInspectionSummary(
  items: Array<{ label: string; status: 'GREEN' | 'YELLOW' | 'RED'; finding?: string; recommendation?: string }>,
  vehicle: VehicleInfo
): Promise<string> {
  const greenCount = items.filter(i => i.status === 'GREEN').length;
  const yellowCount = items.filter(i => i.status === 'YELLOW').length;
  const redCount = items.filter(i => i.status === 'RED').length;
  
  const concernItems = items.filter(i => i.status !== 'GREEN');

  const prompt = `You are an experienced automotive service advisor writing a customer-friendly inspection summary.

Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.mileage ? ` with ${vehicle.mileage.toLocaleString()} miles` : ''}

Inspection Results:
- ${greenCount} items passed (good condition)
- ${yellowCount} items need attention soon
- ${redCount} items require immediate attention

${concernItems.length > 0 ? `Items needing attention:
${concernItems.map(i => `- ${i.label} (${i.status}): ${i.finding || 'Needs service'}`).join('\n')}` : ''}

Write a brief 2-3 paragraph summary for the customer that:
1. Opens with an overview of the vehicle's condition
2. Highlights any safety concerns (RED items) first
3. Mentions items that will need attention soon (YELLOW items)
4. Ends with a positive note about items in good condition
5. Uses friendly, professional language

Keep the tone helpful and not pushy.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content?.trim() || "";
  } catch (error) {
    console.error('AI inspection summary error:', error);
    return "";
  }
}

// ==========================================
// AI Work Order Generation from DVI
// ==========================================

interface DVIFinding {
  itemLabel: string;
  category: string;
  status: 'YELLOW' | 'RED';
  finding?: string;
  recommendation?: string;
}

interface GeneratedLineItem {
  type: 'LABOR' | 'PART';
  description: string;
  quantity: number;
  unitPrice: number;
}

interface GeneratedJob {
  name: string;
  description: string;
  lineItems: GeneratedLineItem[];
  priority: 'high' | 'medium';
  sourceItemLabel: string;
}

interface GenerateJobsFromDVIResult {
  jobs: GeneratedJob[];
  summary: string;
}

export async function generateJobsFromDVI(
  findings: DVIFinding[],
  vehicle: VehicleInfo,
  laborRate: number = 150
): Promise<GenerateJobsFromDVIResult> {
  const defaultResult: GenerateJobsFromDVIResult = { jobs: [], summary: '' };

  if (findings.length === 0) {
    return { jobs: [], summary: 'No items requiring attention were found in the inspection.' };
  }

  try {
    const prompt = `You are an experienced automotive service advisor. Based on the following digital vehicle inspection findings, generate recommended repair jobs with labor and parts estimates.

Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.mileage ? ` with ${vehicle.mileage.toLocaleString()} miles` : ''}
Shop Labor Rate: $${laborRate}/hour

Inspection Findings Requiring Attention:
${findings.map((f, i) => `
${i + 1}. ${f.itemLabel} (${f.category}) - ${f.status === 'RED' ? 'URGENT' : 'NEEDS ATTENTION'}
   Finding: ${f.finding || 'Requires service'}
   Tech Recommendation: ${f.recommendation || 'Service recommended'}
`).join('\n')}

Generate repair jobs in the following JSON format:
{
  "jobs": [
    {
      "name": "Short descriptive job name (e.g., 'Front Brake Pad Replacement')",
      "description": "2-3 sentence customer-friendly description of the repair",
      "priority": "high" or "medium" (RED items = high, YELLOW = medium),
      "sourceItemLabel": "The inspection item label this job addresses",
      "lineItems": [
        {
          "type": "LABOR",
          "description": "Description of labor (e.g., 'Replace front brake pads')",
          "quantity": 1.5,
          "unitPrice": ${laborRate}
        },
        {
          "type": "PART",
          "description": "Part description (e.g., 'Front Brake Pads - Ceramic')",
          "quantity": 1,
          "unitPrice": 89.99
        }
      ]
    }
  ],
  "summary": "A brief 1-2 sentence summary of all recommended work"
}

Guidelines:
- Create one job per distinct repair/service needed
- You may combine related findings into a single job if they're part of the same repair
- Labor quantities are in hours (0.5 = 30 min, 1.0 = 1 hour, etc.)
- Use realistic part prices for a ${vehicle.year} ${vehicle.make} ${vehicle.model}
- For LABOR items, unitPrice should be the hourly rate (${laborRate})
- Each job should have at least one labor line item
- Include parts when they would typically be needed for that repair
- Priority: RED findings = "high", YELLOW findings = "medium"`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    if (!Array.isArray(parsed.jobs)) {
      return defaultResult;
    }

    const validJobs: GeneratedJob[] = parsed.jobs
      .filter((job: any): job is Record<string, any> =>
        typeof job === 'object' &&
        job !== null &&
        typeof job.name === 'string' &&
        typeof job.description === 'string' &&
        Array.isArray(job.lineItems)
      )
      .map((job: any) => ({
        name: job.name,
        description: job.description,
        priority: job.priority === 'high' ? 'high' : 'medium',
        sourceItemLabel: typeof job.sourceItemLabel === 'string' ? job.sourceItemLabel : '',
        lineItems: job.lineItems
          .filter((li: any): li is Record<string, any> =>
            typeof li === 'object' &&
            li !== null &&
            (li.type === 'LABOR' || li.type === 'PART') &&
            typeof li.description === 'string' &&
            typeof li.quantity === 'number' &&
            typeof li.unitPrice === 'number'
          )
          .map((li: any) => ({
            type: li.type as 'LABOR' | 'PART',
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
          })),
      }));

    return {
      jobs: validJobs,
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    };
  } catch (error) {
    console.error('AI generate jobs from DVI error:', error);
    return defaultResult;
  }
}
