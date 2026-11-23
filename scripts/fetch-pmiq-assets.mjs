/**
 * One-off, read-only import of Tim Hunt's Pre-Mock Interview Questionnaires
 * (PMIQ) into the repository, so the Student Support Library's study
 * interview preparation page can give each form its own download link.
 *
 * Tim Hunt's brief, 18 November 2026 ("Student Library mock interview
 * page"): the nine UK forms in "PDF UK PMIQ 1-9", the PDFs currently in
 * each folder of the NONUK PMIQ folder, and the "Pre-CAS Interview" MP4 for
 * the UK section, all under 16_WEBSITE_Artificial Inteligence (AI) / 07
 * Landing Pages / Mock interviews. The Archive folder beside them holds an
 * older "PDF UK PMIQ 1-9"; he said it is for reference only, so none of its
 * item ids is here. The two Word files in the Debrecen folder are not PDFs
 * and are not linked ("Please link to the PDFs").
 *
 * Same shape and same reasons as scripts/fetch-website-assets.mjs: the
 * build container holds no Graph credentials, the Microsoft 365 review
 * tooling returns text and rendered images but never file bytes, and the
 * SHAREPOINT_GRAPH_* application already trusted for read-only SharePoint
 * access exists only inside the Railway service. So this runs under
 * `railway run` from .github/workflows/fetch-website-assets.yml with
 * asset_set "pmiq".
 *
 * THE VIDEO. At first it was held back as a one-day run artifact, because
 * this repository is public and a recording of a real student needs their
 * consent on record before it is committed. WSA's tools could not download
 * the artifact, so Tom Arrington was asked; on 23 November 2026 he
 * confirmed "It's been oked it's fine", and the video is now committed to
 * client/public/videos for the UK section, as Tim asked.
 *
 * It reads. It never writes to SharePoint, never lists a folder, never
 * prints a token, and touches only the explicit item ids below, each read
 * from the folder listings on 22 November 2026.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const GRAPH = "https://graph.microsoft.com/v1.0";
const DRIVE_ID =
  "b!ZS3Ci2sXE0q78H6V2FWhiZpqxaBHOYJPqecEsWyKWRFvB8iImKYDQL3lj9332phP";
const PDF_DIR = "client/public/downloads/pmiq";

/** driveItem id -> repository path, relative to the repo root. */
const PDFS = [
  // PMIQ_- UK - Pre_Mock_Interview_Questionnaires / PDF UK PMIQ 1-9
  [
    "01JQQ47XVS3CB6OHAEJRFIU5CE7VJP7BUU",
    "pmiq-01-education-course-interview.pdf",
  ],
  [
    "01JQQ47XUVEWI6O2QDKZD2MOWXFKM65OSG",
    "pmiq-02-social-work-course-interview.pdf",
  ],
  [
    "01JQQ47XS5TEZQKPMVXNEIMPHZVJWH2SNO",
    "pmiq-03-nursing-course-interview.pdf",
  ],
  [
    "01JQQ47XVOIPLYF2DGHFA3MIYAFODCARMA",
    "pmiq-04-public-health-course-interview.pdf",
  ],
  ["01JQQ47XRZVI5LG3U5QZGYTBOD4T7GZUPB", "pmiq-05-phd-interview.pdf"],
  [
    "01JQQ47XS4SJA4VCQHDVDKKGHZWSNRVKRX",
    "pmiq-06-university-scholarship-interview.pdf",
  ],
  ["01JQQ47XXLBCYHRZTR7RELEIT5U2V5ZF7Q", "pmiq-07-cas-shield-coaching.pdf"],
  [
    "01JQQ47XQS6CCZT752DBAKW4NAAZVJMXDT",
    "pmiq-08-university-credibility-interview.pdf",
  ],
  [
    "01JQQ47XTGHYSDXHDXYND3MIVTUVSEOI6J",
    "pmiq-09-ukvi-credibility-interview.pdf",
  ],
  // PMIQ - NONUK - Pre_Mock_Interview_Questionnaires / 20-29_Australian Visa Interview
  [
    "01JQQ47XR6UPTXZTQL2JGIBJOUA5QXSKBL",
    "pmiq-20-australia-student-visa-interview.pdf",
  ],
  [
    "01JQQ47XUOBXVPGGPVBBH2DBXDZJC7JSDX",
    "pmiq-21-australia-credibility-interview.pdf",
  ],
  // 30_39_Canadian Visa Interview
  [
    "01JQQ47XWGOTPSKUO5V5DYW3MXPOPYJDZN",
    "pmiq-30-canada-study-permit-interview.pdf",
  ],
  [
    "01JQQ47XU2XWWXRVCSI5CYHM6FAUEQIGZE",
    "pmiq-31-canada-credibility-interview.pdf",
  ],
  // 40-49_Cyprus West University
  [
    "01JQQ47XQREPR3S46FHZC2KXQOHGMVBQOJ",
    "pmiq-40-cyprus-west-university-entry-and-student-permit.pdf",
  ],
  [
    "01JQQ47XSW7NVA64JR25GIH7FUV5EIL5SI",
    "pmiq-41-cyprus-west-university-credibility-interview.pdf",
  ],
  // 50-59_German University Visa interview
  [
    "01JQQ47XRLIIK7BTXPLRBJXLRLHKXITFCO",
    "pmiq-50-germany-student-visa-interview.pdf",
  ],
  [
    "01JQQ47XU3JA6KOSTBIBAITBPEOB2ZNACO",
    "pmiq-51-germany-credibility-interview.pdf",
  ],
  // 60-69_The British University, Cyprus
  [
    "01JQQ47XTBTAMEPLUE6JFIEBXVXXP6Z22T",
    "pmiq-60-uclan-cyprus-student-visa-and-arrival.pdf",
  ],
  [
    "01JQQ47XSYIC373ESLJZCYWZI4PQ6MCHYE",
    "pmiq-61-uclan-cyprus-credibility-interview.pdf",
  ],
  // 70_79_University of Debrecen
  [
    "01JQQ47XQPSXT4VFBIH5AKUZKNRTHEUHAN",
    "pmiq-70-debrecen-student-visa-and-residence-permit.pdf",
  ],
  [
    "01JQQ47XRLVCJLMIOLHVCLKLKJGMW3YLN7",
    "pmiq-71-debrecen-credibility-interview.pdf",
  ],
  [
    "01JQQ47XSUBI74LDWFA5BIXL3ZA4NOL5H3",
    "pmiq-72-debrecen-msc-engineering-management-interview.pdf",
  ],
  // 80-89_USA Visa Interview
  [
    "01JQQ47XXDRFOVBCBNSZFK7BLQTF3JSZZV",
    "pmiq-80-usa-f1-student-visa-interview.pdf",
  ],
  [
    "01JQQ47XXCZCS5YVKVNZBYWQYN7HWJY5O3",
    "pmiq-81-usa-credibility-interview.pdf",
  ],
].map(([itemId, name]) => [itemId, `${PDF_DIR}/${name}`]);

/** Mock interviews / Pre-CAS Interview.mp4, cleared on 23 November 2026. */
const VIDEO = [
  "01JQQ47XRNPXQD3UGYSJBLPIFPPXT3LHOH",
  "client/public/videos/pre-cas-interview.mp4",
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(
      `Missing ${name}. Run this through \`railway run\` against the app service.`
    );
    process.exit(1);
  }
  return value;
}

async function accessToken() {
  const tenantId = requireEnv("SHAREPOINT_GRAPH_TENANT_ID");
  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: requireEnv("SHAREPOINT_GRAPH_CLIENT_ID"),
        client_secret: requireEnv("SHAREPOINT_GRAPH_CLIENT_SECRET"),
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }).toString(),
    }
  );
  if (!response.ok)
    throw new Error(`Graph token request failed (HTTP ${response.status}).`);
  const data = await response.json();
  return data.access_token;
}

/** A PDF starts "%PDF-". */
const isPdf = bytes => bytes.subarray(0, 5).toString("latin1") === "%PDF-";
/** An MP4 carries "ftyp" at byte 4. */
const isMp4 = bytes => bytes.subarray(4, 8).toString("latin1") === "ftyp";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);

async function main() {
  const token = await accessToken();
  let failures = 0;
  const items = [
    ...PDFS.map(([id, path]) => [id, path, isPdf, "PDF"]),
    [...VIDEO, isMp4, "MP4"],
  ];
  for (const [itemId, relativePath, check, kind] of items) {
    const response = await fetch(
      `${GRAPH}/drives/${DRIVE_ID}/items/${itemId}/content`,
      {
        headers: { Authorization: `Bearer ${token}` },
        redirect: "follow",
      }
    );
    if (!response.ok) {
      console.error(`FAIL ${relativePath} (HTTP ${response.status})`);
      failures += 1;
      continue;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!check(bytes)) {
      console.error(
        `FAIL ${relativePath}: not a ${kind} (${bytes.length} bytes)`
      );
      failures += 1;
      continue;
    }
    const target = resolve(repoRoot, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes);
    console.log(`OK   ${relativePath} (${bytes.length} bytes)`);
  }
  if (failures > 0) {
    console.error(`${failures} item(s) could not be read.`);
    process.exit(1);
  }
  console.log(`All ${PDFS.length} questionnaires and the video imported.`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
