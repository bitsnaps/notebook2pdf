import { join, resolve } from "https://deno.land/std/path/mod.ts";
import { serve } from "https://deno.land/std/http/server.ts";
import { isURL } from "https://deno.land/x/is_url/mod.ts";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import * as ipynb from "npm:ipynb2html";
import { Document } from "npm:nodom";

const port = "8080";
const baseDir = "/tmp";

const handler = async (req: Request) => {
  let url: URL | string = "";
  if (isURL(req.url)) {
    url = new URL(req.url);
  }
  if ((url as URL).pathname === "/upload" && req.method === "POST") {
    if (req.body) {
      const form = await req.formData();
      //const notebook = await form.get("notebook");

      for (const pair of form.entries()) {
        if (pair[0] === "notebook") {
          const notebook = pair[1];
          if (notebook instanceof File) {
            const newFileName = resolve(join(baseDir, notebook.name));

            const notebookBuffer = await notebook.arrayBuffer();
            await Deno.writeFile(
              `${newFileName}`,
              new Uint8Array(notebookBuffer),
            );

            // Read the uploaded notebook
            const jsonContent = await Deno.readTextFile(newFileName);

            // Convert the notebook to HTML
            const renderNotebook = ipynb.createRenderer(new Document());
            const notebookJsonContent = await JSON.parse(jsonContent);

            let htmlContent =
              renderNotebook.render(notebookJsonContent).outerHTML;

            // write to HTML
            const htmlFilePath = newFileName.toString().replace(
              ".ipynb",
              ".html",
            );

            const date = new Date();
            const formattedDate =
              date.toLocaleString("en-US", { month: "long" }) + " " +
              date.getDate() + ", " + date.getFullYear();

            htmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${notebook.name}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ipynb2html/dist/notebook.min.css" crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css" crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release/build/styles/default.min.css" crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release/build/styles/xcode.min.css" crossorigin="anonymous">
<style>
    div.nb-notebook {
      margin: 5px 65px;
    }
    p.nb-title {
        text-align: center;
        font-size: 80%;
    }
    div.nb-source.nb-input::before, div.nb-output::before {
        color: #2F3E9F
    }
    table.dataframe {
        border-color: #f3f3f3;
        border-collapse: collapse;
    }
    @media print {
     body { font-family: georgia, times, serif; }
     div.nb-notebook { margin: 5px 15px; }
    }
</style>
  </head>
  <body>
  <p class="nb-title">${formattedDate}</p>
  ${htmlContent}
  </body>
  </html>`;
            await Deno.writeTextFile(htmlFilePath, htmlContent);
            console.log(`htmlFilePath: ${htmlFilePath}`);

            // trying to generate a PDF using chromium
            let chromiumPath = "/usr/bin/chromium-browser";
            // Grab chromium executable path
            try {
              const result = Deno.run({
                cmd: ["which", "chromium"],
                stdout: "piped",
              });
              chromiumPath = new TextDecoder().decode(await result.output())
                .trim();
            } catch (_error) {
              console.log("Could not find chromium.");
            }

            let pdfFilePath = "";
            try {
              // Convert the HTML to PDF using Puppeteer
              const browser = await puppeteer.launch({
                executablePath: chromiumPath,
                headless: true,
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
              });
              const page = await browser.newPage();
              await page.goto(`file://${htmlFilePath}`, {
                waitUntil: "networkidle2",
              });
              pdfFilePath = htmlFilePath.replace(".html", ".pdf");
              console.log(`pdfFilePath: ${pdfFilePath}`);

              await page.pdf({ path: pdfFilePath, format: "A4" });
              await browser.close();
            } catch (error) {
              console.log(`We could not render the file on chrome: ${error}`);
            }

            try {
              // Open the PDF file
              const pdfFile = await Deno.readFile(pdfFilePath);

              //const pdfFile = await Deno.open(pdfFilePath, { read: true, write: false});
              //console.log(`pdfFile: ${pdfFile}`);
              console.log(`size: ${pdfFile.length}`);

              return new Response(pdfFile, {
                headers: {
                  "Content-Type": "application/pdf",
                  "Content-Length": `${pdfFile.length}`,
                },
              });
            } catch (error) {
              if (error instanceof Deno.errors.NotFound) {
                // file or directory does not exist
                // return new Response(`Sorry, we could not create the file. ${error}`);

                console.log(
                  `Sorry, we could not create the PDF, se we've provided you the HTML file which you can print right from your browser.`,
                );
                const content = await Deno.readTextFile(htmlFilePath);
                return new Response(content, {
                  headers: { "content-type": "text/html" },
                });
              } else {
                // unexpected error, maybe permissions, pass it along
                return new Response(`Sorry, an error has occured. ${error}`);
                //throw error;
              }
            }
          }
        }
      }
    }
  }
  const content = await Deno.readTextFile("./index.html");
  return new Response(content, { headers: { "content-type": "text/html" } });
};

serve(handler, { port: parseInt(Deno.env.get("PORT") || port) });
//console.log("app listening on port " + port);
