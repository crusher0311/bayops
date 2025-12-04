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
