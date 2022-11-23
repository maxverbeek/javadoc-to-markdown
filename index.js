const core = require("@actions/core");
const github = require("@actions/github");

const fs = require("fs");

const filename = core.getInput("headerfile");

const file = fs.readFileSync(filename, "utf-8");
const lines = file.split("\n").map((l) => l.trim());

let funcdefs = [];

let currentSection = [];
let capturing = false;
let captureOnemore = false;

// lelijkste code ooit, pls ignore
for (line of lines) {
  if (capturing) {
    currentSection = [...currentSection, line];
  }

  if (line.startsWith("/**")) {
    capturing = true;
  }

  if (captureOnemore) {
    captureOnemore = false;
    capturing = false;

    funcdefs = [...funcdefs, currentSection];
    currentSection = [];
  }

  if (line.startsWith("*/")) {
    captureOnemore = true;
  }
}

const test = [
  "/**",
  "* @brief Saves an image at the provided location. The location must be a .pgm file. Pixels values are stored as ascii",
  "* (human readable) values in the file. Note that only (rounded) real values are stored.",
  "*",
  "* @param image The images to save.",
  "* @param path The location to save the image at.",
  "*/",
  "void saveComplexImagePGMAscii(ComplexImage image, const char *path);",
];

function parseAtSymbols(lines) {
  let returnval = "";

  let functiondef = lines[lines.length - 1];
  let doclines = lines.splice(0, lines.length - 1);

  const concatenated = doclines.map((l) => l.replace(/^[\s\*]+/, "")).join("");

  let briefmatch = concatenated.match(/\@brief (?<brief>.*?)(?=(?:\@|\*\/))/);
  let params = concatenated.matchAll(/\@param (.*?)(?=(?:\@|\*\/|\/|$))/g);

  let brief = briefmatch.groups["brief"];

  let funcname = functiondef ? [...functiondef.match(/\w+ (\w+)/)][1] : "";

  return {
    brief: brief,
    params: [...params].map((p) => p[1]),
    functiondef,
    funcname,
  };
}

function formatParam(param) {
  const [first, ...rest] = param.split(" ");

  return `- \`${first}\` -- ${rest.join(" ")}`;
}

let out = "";

for (func of funcdefs.splice(1)) {
  const symbols = parseAtSymbols(func);

  const title = `#### \`${symbols.funcname}\``;
  const definition = "```c\n" + symbols.functiondef + "\n```\n";
  const desc = `> ${symbols.brief}`;
  const paramlist = symbols.params.map(formatParam).join("\n");

  out += `
${title}

${definition}

${desc}

${paramlist}

`;
}

const outdir = core.getInput("outdir");

fs.mkdirSync(outdir);
fs.writeFileSync(`${outdir}/documentation.md`, out);
