const axios = require("axios");
const cheerio = require("cheerio");
const { extractCoursesWithOllama, validateCoursesWithOllama, isOllamaAvailable } = require("./ollamaExtractor");

class ScholarshipScraper {
  constructor() {
    this.headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    };
    this.baseUrl = "https://afterschool.my";
  }

  async scrapeScholarships(options = {}) {
    try {
      const scholarships = [];
      const startUrl = `${this.baseUrl}/scholarship`;
      const maxPages = Number(options.maxPages || 100);
      const shouldCancelCallback = options.shouldCancel || (() => false);
      const onProgressCallback = options.onProgress || (() => {});

      const seenUrls = new Set();
      const listingQueue = [startUrl];

      const canonicalize = (href) => {
        try {
          if (!href) return null;
          const u = new URL(href.startsWith('http') ? href : `${this.baseUrl}${href}`);
          u.hash = '';
          // keep query if it's pagination like ?page=, drop others
          const params = new URLSearchParams(u.search);
          const pageParam = params.get('page');we
          u.search = pageParam ? `?page=${pageParam}` : '';
          let out = u.toString();
          if (out.endsWith('/')) out = out.slice(0, -1);
          return out;
        } catch {
          return href;
        }
      };

      const extractScholarshipLinksFrom$ = ($) => {
        const links = [];
        $("a[href]").each((i, element) => {
          const $link = $(element);
          // Case 1: <a><h3>Title</h3></a>
          let name = $link.find("h3.MuiTypography-root.MuiTypography-h3").first().text().trim();
          // Case 2: <h3><a>Title</a></h3>
          if (!name && $link.parent('h3').length) {
            name = $link.text().trim();
          }
          const relativeLink = $link.attr("href");
          const fullLink = relativeLink && (relativeLink.startsWith("http") ? relativeLink : `${this.baseUrl}${relativeLink}`);
          if (name && fullLink && /\/scholarship\//.test(fullLink) && !/\/scholarship\/?$/.test(relativeLink || '')) {
            links.push({ url: canonicalize(fullLink), title: name });
          }
        });
        return links;
      };

      const findNextPageUrlFrom$ = ($, currentUrl) => {
        // Heuristics: rel=next, aria-label="Next", link text contains Next or '>'
        let href = $('a[rel="next"]').attr('href')
          || $('a[aria-label*="Next" i]').attr('href')
          || $('a:contains("Next")').attr('href')
          || $('a:contains(">")').attr('href');
        // Also probe numeric pagination and current active page
        if (!href) {
          const active = $('li.MuiPaginationItem-root.Mui-selected a[href], li.active a[href]').attr('href');
          if (active) {
            const m = active.match(/page=(\d+)/);
            const current = m ? parseInt(m[1], 10) : null;
            if (current) {
              const next = current + 1;
              try {
                const u = new URL(currentUrl);
                const params = new URLSearchParams(u.search);
                params.set('page', String(next));
                u.search = `?${params.toString()}`;
                href = u.toString();
              } catch {}
            }
          }
        }
        if (!href) return null;
        const full = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
        return canonicalize(full);
      };

      const extractAllPaginationUrlsFrom$ = ($, currentUrl) => {
        const urls = new Set();
        // Collect any links with a page parameter
        $('a[href*="page="]').each((i, el) => {
          const href = $(el).attr('href');
          if (!href) return;
          const full = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
          urls.add(canonicalize(full));
        });
        // Collect MUI pagination buttons without href (client-side). Build query URLs.
        const addPageNumber = (numText) => {
          const n = parseInt(String(numText).trim(), 10);
          if (!isNaN(n) && n > 0) {
            const built = `${this.baseUrl}/scholarship?page=${n}`;
            urls.add(canonicalize(built));
          }
        };
        // aria-label like "Go to page 2"
        $('button[aria-label^="Go to page"]').each((i, el) => {
          const label = ($(el).attr('aria-label') || '').trim();
          const m = label.match(/Go to page\s+(\d+)/i);
          if (m) addPageNumber(m[1]);
        });
        // selected/current page aria-current="true" aria-label="page 1"
        $('button[aria-label^="page "]').each((i, el) => {
          const label = ($(el).attr('aria-label') || '').trim();
          const m = label.match(/page\s+(\d+)/i);
          if (m) addPageNumber(m[1]);
        });
        // Numeric page buttons
        $('button.MuiPaginationItem-page').each((i, el) => {
          const txt = ($(el).text() || '').trim();
          if (/^\d+$/.test(txt)) addPageNumber(txt);
        });
        // If numeric pagination exists without explicit page param, infer by anchor text
        $('a[href]').each((i, el) => {
          const $a = $(el);
          const text = ($a.text() || '').trim();
          if (/^\d+$/.test(text)) {
            let href = $a.attr('href') || '';
            if (href) {
              const full = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
              urls.add(canonicalize(full));
            } else if (currentUrl) {
              // Construct from currentUrl by swapping page
              try {
                const u = new URL(currentUrl);
                const params = new URLSearchParams(u.search);
                params.set('page', text);
                u.search = `?${params.toString()}`;
                urls.add(canonicalize(u.toString()));
              } catch {}
            }
          }
        });
        // Try to expand to a contiguous range 1..maxPage
        let maxPage = 1;
        for (const u of urls) {
          const m = u.match(/(?:[?&]page=|\/page\/)(\d+)/i);
          if (m) {
            const n = parseInt(m[1], 10);
            if (!isNaN(n)) maxPage = Math.max(maxPage, n);
          }
        }
        try {
          const base = new URL(currentUrl || `${this.baseUrl}/scholarship`);
          for (let i = 1; i <= Math.min(maxPage, maxPages); i++) {
            const params = new URLSearchParams(base.search);
            params.set('page', String(i));
            base.search = `?${params.toString()}`;
            urls.add(canonicalize(base.toString()));
          }
        } catch {}
        return Array.from(urls);
      };

      let pagesCrawled = 0;
      const allListingLinks = [];

      while (listingQueue.length && pagesCrawled < maxPages) {
        // Check for cancellation during pagination
        if (shouldCancelCallback()) {
          break;
        }
        
        const url = listingQueue.shift();
        if (!url || seenUrls.has(url)) continue;
        seenUrls.add(url);
        pagesCrawled++;

        const response = await axios.get(url, {
          headers: this.headers,
          timeout: 15000,
        });
        const $ = cheerio.load(response.data);

        const pageLinks = extractScholarshipLinksFrom$($);
        allListingLinks.push(...pageLinks);

        const discovered = extractAllPaginationUrlsFrom$($, url);
        let queuedAny = false;
        for (const nx of discovered) {
          if (nx && !seenUrls.has(nx) && !listingQueue.includes(nx)) {
            listingQueue.push(nx);
            queuedAny = true;
          }
        }
        if (!queuedAny) {
          const nextUrl = findNextPageUrlFrom$($, url);
          if (nextUrl && !seenUrls.has(nextUrl)) {
            listingQueue.push(nextUrl);
          }
        }
        // politeness delay between listing pages
        await new Promise((r) => setTimeout(r, 1000));
      }

      // Deduplicate scholarship links by URL
      const uniqMap = new Map();
      for (const item of allListingLinks) {
        if (!uniqMap.has(item.url)) uniqMap.set(item.url, item);
      }
      const scholarshipLinks = Array.from(uniqMap.values());
      console.log(`Found ${scholarshipLinks.length} scholarships across ${pagesCrawled} pages`);

      // Notify progress: found total scholarships
      onProgressCallback({ 
        phase: 'scraping',
        current: 0, 
        total: scholarshipLinks.length,
        message: `Found ${scholarshipLinks.length} scholarships, scraping details...`
      });

      // Process each scholarship (no artificial 20-item cap)
      let processed = 0;
      for (const link of scholarshipLinks) {
        // Check for cancellation
        if (shouldCancelCallback()) {
          break;
        }
        
        try {
          processed += 1;
          
          // Update progress
          onProgressCallback({
            phase: 'scraping',
            current: processed,
            total: scholarshipLinks.length,
            message: link.title
          });
          
          const scholarshipData = await this.scrapeScholarshipDetails(
            link.url,
            link.title
          );
          if (scholarshipData) {
            scholarships.push(scholarshipData);
          }
          // Delay between detail requests
          await new Promise((resolve) => setTimeout(resolve, 1200));
        } catch (error) {
          console.error(`❌ Error processing ${link.title}:`, error.message);
          continue;
        }
      }

      return scholarships;
    } catch (error) {
      console.error("Main scraping error:", error);
      throw error;
    }
  }

  async scrapeScholarshipDetails(url, title) {
    try {
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 8000,
      });

      const $ = cheerio.load(response.data);

      // Extract Study Level(s) from header, include only diploma and/or degree
      let studyLevel = null;
      let studyLevels = [];
      const h5Tags = $("h5.MuiTypography-root.MuiTypography-h5.css-3ari9v");
      if (h5Tags.length > 0) {
        const rawText = h5Tags.first().text().trim().toLowerCase();
        // Split by common separators and normalize
        const tokens = rawText
          .split(/[\/,|]+|\s*,\s*/)
          .map((t) => t.trim())
          .filter(Boolean);

        const found = new Set();
        for (const token of tokens) {
          if (token.includes("diploma")) found.add("diploma");
          if (
            token.includes("degree") ||
            token.includes("bachelor") ||
            token.includes("undergraduate")
          )
            found.add("degree");
        }
        studyLevels = Array.from(found);
        // For compatibility, set single studyLevel preferring degree over diploma
        if (studyLevels.includes("degree")) studyLevel = "degree";
        else if (studyLevels.includes("diploma")) studyLevel = "diploma";
        else studyLevel = null;
      }

      // FIXED: Enhanced Deadline Extraction Logic
      let deadline = null;
      
      // Method 1: Look for the specific layout pattern in afterschool.my
      // The deadline appears to be in a format like "Study Level | Where to Study | Deadline"
      // IMPORTANT: Exclude JSON/app content like __NEXT_DATA__ and any script/style/noscript content
      const sanitizedBody = $('body')
        .clone()
        .find('script, style, noscript, script#__NEXT_DATA__')
        .remove()
        .end();
      // Try to scope to the main content region around the page title to avoid headers/footers/nav
      const titleSelector = `h1:contains(${JSON.stringify(title).slice(1, -1)})`;
      // Initialize with a safe default to avoid TDZ access
      let contentRoot = sanitizedBody;
      const titleNode = sanitizedBody.find(titleSelector).first();
      if (titleNode && titleNode.length) {
        const closest = titleNode.closest('main, section, article, div');
        if (closest && closest.length) {
          contentRoot = closest;
        }
      }
      if (!contentRoot || contentRoot.length === 0) {
        // Fallback heuristics: choose the largest content block with many paragraphs
        const candidates = sanitizedBody.find('main, article, section, div').filter((i, el) => {
          const $el = $(el);
          if ($el.is('header, footer, nav')) return false;
          const pCount = $el.find('p').length;
          return pCount >= 3;
        });
        contentRoot = candidates && candidates.length ? candidates.first() : sanitizedBody;
      }
      const pageText = contentRoot.text();
      const globalText = sanitizedBody.text();
      
      // Method 0 (targeted like Python): scan label/value blocks in MUI stacks
      const tryExtractDeadlineFromStacks = (root) => {
        try {
          root.find('div.MuiStack-root').each((i, block) => {
            if (deadline) return false;
            const $block = $(block);
            const labelText = $block.find('p').first().text().trim().toLowerCase();
            const h5Text = ($block.find('h5').first().text() || '').trim();

            // Case A: label then value (Python logic)
            if (labelText.includes('deadline') && /^\d{1,2}-\d{1,2}-\d{4}$/.test(h5Text)) {
              deadline = h5Text;

              return false;
            }

            // Case B: value then label (as reported)
            if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(h5Text) && labelText.includes('deadline')) {
              deadline = h5Text;

              return false;
            }
          });

          // Additional sibling search: find any p containing Deadline and check adjacent h5
          if (!deadline) {
            root.find('p').each((i, el) => {
              if (deadline) return false;
              const $p = $(el);
              const text = ($p.text() || '').toLowerCase();
              if (!text.includes('deadline')) return;
              // Check previous and next h5 siblings
              const prevH5 = $p.prevAll('h5').first();
              const nextH5 = $p.nextAll('h5').first();
              const candidates = [prevH5, nextH5];
              for (const c of candidates) {
                if (deadline) break;
                if (c && c.length) {
                  const t = (c.text() || '').trim();
                  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(t)) {
                    deadline = t;

                    break;
                  }
                }
              }
            });
          }
        } catch (e) {}
      };
      tryExtractDeadlineFromStacks(contentRoot);
      if (!deadline) tryExtractDeadlineFromStacks(sanitizedBody);
      
      // Look for the deadline pattern in the text
      const deadlinePatterns = [
        /(\d{1,2}-\d{1,2}-\d{4})\s*Deadline/i,  // "12-09-2025Deadline"
        /Deadline\s*[|]?\s*(\d{1,2}-\d{1,2}-\d{4})/i,  // "Deadline | 12-09-2025"
        /(\d{1,2}-\d{1,2}-\d{4})\s*\|\s*Up to/i,  // "12-09-2025 | Up to"
        /\|\s*(\d{1,2}-\d{1,2}-\d{4})\s*\|/i,  // "| 12-09-2025 |"
      ];

      for (const pattern of deadlinePatterns) {
        let match = pageText.match(pattern);
        if (!match) match = globalText.match(pattern);
        if (match) {
          deadline = match[1];

          break;
        }
      }

      // Method 2: Look in specific HTML elements
      if (!deadline) {

        
        // Search through all elements that might contain the deadline
        sanitizedBody.find('*').each((i, element) => {
          if (deadline) return false; // Break if found
          
          const $el = $(element);
          if ($el.is('script,style,noscript') || $el.attr('id') === '__NEXT_DATA__') {
            return;
          }
          const text = $el.text().trim();
          
          // Look for date patterns in element text
          const dateMatch = text.match(/\b(\d{1,2}-\d{1,2}-\d{4})\b/);
          if (dateMatch) {
            const foundDate = dateMatch[1];
            const [dd, mm, yyyy] = foundDate.split('-');
            
            // Basic validation - check if it's a reasonable date
            const day = parseInt(dd);
            const month = parseInt(mm);
            const year = parseInt(yyyy);
            
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2024 && year <= 2030) {
              // Check if this element or nearby text suggests it's a deadline
              const surroundingText = text.toLowerCase();
              if (surroundingText.includes('deadline') || 
                  surroundingText.includes('due') ||
                  surroundingText.includes('close') ||
                  // Check parent or sibling elements
                  $el.parent().text().toLowerCase().includes('deadline') ||
                  $el.prev().text().toLowerCase().includes('deadline') ||
                  $el.next().text().toLowerCase().includes('deadline')) {
                deadline = foundDate;

                return false; // Break
              }
            }
          }
        });
      }

      // Method 3: Look for MUI Typography elements that might contain dates
      if (!deadline) {

        
        const muiElements = sanitizedBody
          .find('[class*="MuiTypography"], h1, h2, h3, h4, h5, h6, p, span, div')
          .not('script,style,noscript,#__NEXT_DATA__');
        muiElements.each((i, element) => {
          if (deadline) return false;
          
          const $el = $(element);
          const text = $el.text().trim();
          
          // Look for standalone dates that might be deadlines
          if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(text)) {
            const [dd, mm, yyyy] = text.split('-');
            const day = parseInt(dd);
            const month = parseInt(mm);
            const year = parseInt(yyyy);
            
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2024 && year <= 2030) {
              deadline = text;

              return false;
            }
          }
        });
      }

      // Method 4: Fallback - look for any date in the entire page
      if (!deadline) {

        const allDates = (globalText.match(/\b\d{1,2}-\d{1,2}-\d{4}\b/g) || []);
        if (allDates && allDates.length > 0) {
          // Take the first reasonable future date
          for (const date of allDates) {
            const [dd, mm, yyyy] = date.split('-');
            const parsedDate = new Date(`${yyyy}-${mm}-${dd}`);
            const currentDate = new Date();
            
            if (!isNaN(parsedDate.getTime()) && parsedDate > currentDate) {
              deadline = date;

              break;
            }
          }
        }
      }

      if (!deadline) {

      }
      // Extract Email (multiple strategies)
      let email = null;

      // Helper: decode Cloudflare-protected emails
      const decodeCfEmail = (encoded) => {
        try {
          const r = parseInt(encoded.substr(0, 2), 16);
          let emailDecoded = "";
          for (let n = 2; n < encoded.length; n += 2) {
            const charCode = parseInt(encoded.substr(n, 2), 16) ^ r;
            emailDecoded += String.fromCharCode(charCode);
          }
          return emailDecoded;
        } catch (_) {
          return null;
        }
      };

      // Helper: try to normalize common obfuscations like "name [at] domain [dot] com"
      const tryExtractFromObfuscated = (text) => {
        if (!text) return null;
        const lowered = text
          .replace(/\s*\[at\]\s*|\s*\(at\)\s*|\s+at\s+/gi, "@").replace(/\s*\[dot\]\s*|\s*\(dot\)\s*|\s+dot\s+/gi, ".")
          .replace(/\s*\{at\}\s*/gi, "@").replace(/\s*\{dot\}\s*/gi, ".");
        const compact = lowered.replace(/\s+/g, " ");
        const rx = /[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/;
        const m = compact.match(rx);
        return m ? m[0] : null;
      };

      // Strategy 0: Cloudflare data-cfemail
      if (!email) {
        const cfNode = $('[data-cfemail]').first();
        if (cfNode && cfNode.length) {
          const encoded = cfNode.attr('data-cfemail');
          const decoded = encoded ? decodeCfEmail(encoded) : null;
          if (decoded && /[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(decoded)) {
            email = decoded;
          }
        }
      }
      const accordionSections = $(".MuiAccordionDetails-root.css-u7qq7e");
      accordionSections.each((i, section) => {
        const $section = $(section);
        const heading =
          $section.prev(".MuiAccordionSummary-content") ||
          $section.prev('button[class*="MuiAccordionSummary-root"]') ||
          $section.parent().find('[class*="MuiAccordionSummary"]').first();

        if (heading.length && heading.text().toLowerCase().includes("contact")) {
          const sectionText = $section.text();
          const emailMatch = sectionText.match(/[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/);
          if (emailMatch) {
            email = emailMatch[0];
            return false; // Break out of each loop
          }
          // Try obfuscated patterns inside contact section
          if (!email) {
            const obf = tryExtractFromObfuscated(sectionText);
            if (obf) {
              email = obf;
              return false;
            }
          }
        }
      });

      // Fallback: mailto link
      if (!email) {
        const mailto = $('a[href^="mailto:"]').attr('href');
        if (mailto) {
          const extracted = mailto.replace(/^mailto:/i, '').split('?')[0].trim();
          if (extracted && /[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(extracted)) {
            email = extracted;
          }
        }
      }

      // Fallback: any email pattern in full page text
      if (!email) {
        const emailMatch = pageText.match(/[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/);
        if (emailMatch) {
          email = emailMatch[0];
        } else {
          const obf = tryExtractFromObfuscated(pageText);
          if (obf) {
            email = obf;
          }
        }
      }

      // Extract Website Sponsor (exactly like Python version)
      let websiteSponsor = null;
      const cardSections = $(
        ".MuiPaper-root.MuiPaper-elevation.MuiPaper-rounded.MuiPaper-elevation1.MuiCard-root.css-9rv2mg"
      );
      cardSections.each((i, card) => {
        const $card = $(card);
        const linkTags = $card.find("a[href]");
        linkTags.each((j, link) => {
          const href = $(link).attr("href");
          if (href && href.startsWith("http")) {
            websiteSponsor = href;
            return false; // Break out of inner loop
          }
        });
        if (websiteSponsor) {
          return false; // Break out of outer loop
        }
      });

      // Extract minimum CGPA/GPA requirement if mentioned on the page
      // Accept decimals like 3.50, 3.00, 3.33 and reasonable range (2.00 - 4.00)
      let minGPAFromPage = null;
      const candidateValues = [];

      // Search with multiple robust patterns, globally
      const gpaRegexes = [
        /(minimum|min)\s*(cgpa|gpa)\s*[:\-]?\s*(\d(?:\.\d{1,2})?)/gi,
        /(cgpa|gpa)[^\d]{0,40}(\d(?:\.\d{1,2})?)/gi,
        /(\d(?:\.\d{1,2})?)\s*(cgpa|gpa)/gi,
        /(at\s+least|of|>=?)\s*(\d(?:\.\d{1,2})?)\s*(cgpa|gpa)/gi,
      ];

      for (const rx of gpaRegexes) {
        const matches = (globalText.matchAll ? globalText.matchAll(rx) : pageText.matchAll(rx));
        for (const m of matches) {
          const groups = m.slice(1).filter(Boolean);
          for (const g of groups) {
            const v = parseFloat(g);
            if (!isNaN(v) && v >= 2.0 && v <= 4.0) candidateValues.push(v);
          }
        }
      }

      // Also use proximity search: number within 20 chars of CGPA/GPA (either order)
      const proximityRegexes = [
        /(\d(?:\.\d{1,2})?).{0,20}\b(CGPA|GPA)\b/gi,
        /\b(CGPA|GPA)\b.{0,20}(\d(?:\.\d{1,2})?)/gi,
      ];
      for (const rx of proximityRegexes) {
        const matches = (globalText.matchAll ? globalText.matchAll(rx) : pageText.matchAll(rx));
        for (const m of matches) {
          const v1 = parseFloat(m[1]);
          const v2 = parseFloat(m[2]);
          const candidates = [v1, v2].filter(
            (v) => !isNaN(v) && v >= 2.0 && v <= 4.0
          );
          candidateValues.push(...candidates);
        }
      }

      if (candidateValues.length > 0) {
        // Choose the highest mentioned value as the minimum requirement
        minGPAFromPage = Number(Math.max(...candidateValues).toFixed(2));

      } else {

      }

      // Extract provider name with better logic
      let providerName = "Unknown Provider";
      if (websiteSponsor) {
        try {
          const urlObj = new URL(websiteSponsor);
          const hostname = urlObj.hostname.replace("www.", "");
          providerName = hostname.split(".")[0];
          // Capitalize first letter
          providerName =
            providerName.charAt(0).toUpperCase() + providerName.slice(1);
        } catch (e) {
          // Fallback to URL-based detection
          if (url.includes("maxis")) providerName = "Maxis";
          else if (url.includes("msu")) providerName = "MSU";
          else if (url.includes("taylor")) providerName = "Taylor's University";
          else {
            const titleWords = title.split(" ");
            if (titleWords.length > 0) {
              providerName = titleWords[0];
            }
          }
        }
      }

      // Normalize deadline string to a real Date for DB storage
      let deadlineDate = null;
      if (deadline && /^\d{1,2}-\d{1,2}-\d{4}$/.test(deadline)) {
        const [dd, mm, yyyy] = deadline.split("-");
        deadlineDate = new Date(`${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}T00:00:00.000Z`);
      }

      // Extract eligible courses/fields
      let eligibleCourses = [];
      const normalizeCourse = (s) => s.replace(/\s+/g, ' ').trim();

      // Check for "open to all" / "all fields" statements FIRST
      const openToAllPatterns = [
        /open to all (courses|programmes|programs|fields|disciplines)/i,
        /all (courses|programmes|programs|fields|disciplines) are eligible/i,
        /available for all (courses|programmes|programs|fields|disciplines)/i,
        /available for all .{1,100}(programmes|programs|courses)/i, // TAR UC: "Available for all Foundation, Diploma and Bachelor Degree programmes"
        /open for all .{1,100}(degrees|courses|programmes|programs)/i, // KFC: "open for all undergraduate degrees"
        /any (course|programme|program|field|discipline)/i,
        /not restricted to any (course|programme|program|field|discipline)/i,
        /no specific (course|programme|program|field|discipline) requirement/i
      ];
      
      const hasOpenToAll = openToAllPatterns.some(pattern => pattern.test(pageText));
      if (hasOpenToAll) {
        console.log(`   ✓ Detected "open to all" statement for ${title}`);
        eligibleCourses = ["All Fields"];
      } else {
        // 1) Look for sections likely titled "Preferred Discipline", "Eligible Courses", "Fields of Study"
        const possibleSectionHeadings = [
          'preferred discipline', 'preferred disciplines', 'eligible courses', 'eligible programmes', 'fields',
          'field of study', 'fields of study', 'courses', 'programmes', 'programs', 'disciplines', 'areas of study'
        ];

        // Check headings, divs, and paragraphs (some sites use <div> or <p> instead of proper headings)
        const allCandidates = []; // Collect all possible course lists
        
        $('h1, h2, h3, h4, h5, h6, strong, b, div, p').each((i, el) => {
          const headingText = $(el).text().toLowerCase().trim();
          
          // Only check if text is short enough to be a heading (not entire page content)
          if (headingText.length > 200) return;
          
          if (possibleSectionHeadings.some(k => headingText.includes(k))) {
            // gather list items or bullet-like lines following the heading
            const container = $(el).closest('section, div, article').length ? $(el).closest('section, div, article') : $(el).parent();
            const items = [];
            container.find('li').each((j, li) => {
              const t = normalizeCourse($(li).text());
              if (t && t.length <= 100) items.push(t);
            });
            
            if (items.length === 0) {
              // fallback: split paragraphs by newline or bullet characters
              const para = container.find('p').first().text();
              if (para) {
                para.split(/[\n•·\-\u2022]/).map(normalizeCourse).forEach(v => {
                  if (v && v.length <= 100) items.push(v);
                });
              }
            }
            
            if (items.length > 0) {
              allCandidates.push(items);
            }
          }
        });
        
        // Filter out criteria lists and pick the best candidate
        const criteriaKeywords = ['must be', 'must have', 'applicants', 'demonstrate', 'possess', 'competent', 'aged', 'citizen'];
        
        for (const candidate of allCandidates) {
          const firstItem = candidate[0] ? candidate[0].toLowerCase() : '';
          const looksLikeCriteria = criteriaKeywords.some(keyword => firstItem.includes(keyword));
          
          if (!looksLikeCriteria) {
            // This looks like a course list!
            eligibleCourses = candidate
              .map(s => s.replace(/^[-•·]\s*/, ''))
              .filter(s => s && s.length > 1)
              .slice(0, 50);
            break; // Stop at first non-criteria list
          }
        }
        
        // 1.5) If still empty, search ALL lists on page and pick ones that look like courses
        if (eligibleCourses.length === 0) {
          const courseKeywords = ['engineering', 'science', 'business', 'accounting', 'medicine', 'law', 'education', 'arts', 'technology', 'management', 'surveying', 'architecture', 'design'];
          const navigationKeywords = ['about us', 'contact', 'home', 'apply', 'courses', 'scholarship', 'institution', 'university', 'college'];
          
          $('ul, ol').each((i, list) => {
            if (eligibleCourses.length > 0) return;
            
            const items = [];
            $(list).find('li').each((j, li) => {
              const t = normalizeCourse($(li).text());
              if (t && t.length >= 3 && t.length <= 100) items.push(t);
            });
            
            if (items.length >= 3 && items.length <= 30) {
              const firstItem = items[0].toLowerCase();
              const looksLikeCriteria = criteriaKeywords.some(k => firstItem.includes(k));
              const looksLikeNav = navigationKeywords.some(k => firstItem.includes(k));
              const looksLikeCourses = courseKeywords.some(k => firstItem.includes(k));
              
              if (!looksLikeCriteria && !looksLikeNav && looksLikeCourses) {
                eligibleCourses = items
                  .map(s => s.replace(/^[-•·]\s*/, ''))
                  .filter(s => s && s.length > 1)
                  .slice(0, 50);
              }
            }
          });
        }

        // 2) If still empty, try extracting from sentences like "fields such as A, B, and C"
        if (eligibleCourses.length === 0) {
          const sources = [];
          sources.push(pageText);
          const sentenceRx = /(fields|disciplines|areas|courses)[^\.\n]{0,40}\b(such as|like|include|including|are|eligible|comprise|cover)\b([^\.\n]{10,200})/i;
          const splitCandidates = (segment) => {
            return segment
              .replace(/\(.*?\)/g, "")
              .split(/,|\band\b|\bor\b|\u2022|\|/i)
              .map(s => normalizeCourse(s))
              .map(s => s.replace(/^and\s+/i, '').replace(/^or\s+/i, ''))
              .filter(Boolean);
          };
          const isTooGeneric = (s) => /^(fields|disciplines|courses|areas|more|etc)\b/i.test(s) || s.length < 3;
          const looksLikeCss = (s) => /[{;}]/.test(s) || /\.[a-z0-9_-]{2,}/i.test(s) || /display\s*:/i.test(s);
          for (const src of sources) {
            const m = src.match(sentenceRx);
            if (m && m[3]) {
              const parts = splitCandidates(m[3]);
              const cleaned = parts
                .map(s => s.replace(/^of\s+/i, ''))
                .map(s => s.replace(/\s*and\s*$/i, ''))
                .filter(s => !isTooGeneric(s) && !looksLikeCss(s) && s.length <= 60);
              if (cleaned.length) {
                eligibleCourses = Array.from(new Set(cleaned));
                break;
              }
            }
          }
        }
      }

      // Final sanitation: remove nav/ads/css noise and overly long entries
      const stopwords = [
        'advertise', 'private university', 'public university', 'home', 'institutions', 'contact us', 'apply now',
        'browse by', 'filter by', 'search by', 'view all', 'read more', 'learn more', 'find out more',
        'scholarship', 'scholarships', 'application', 'deadline', 'about us', 'terms', 'privacy'
      ];
      const looksLikeCss = (s) => /[{;}]/.test(s) || /\.[a-z0-9_-]{2,}/i.test(s) || /display\s*:/i.test(s);
      const nonLetterRatio = (s) => {
        const letters = (s.match(/[A-Za-z]/g) || []).length;
        return 1 - (letters / Math.max(1, s.length));
      };
      // Detect grade/qualification patterns (e.g., "STPM/A-Level - 3As", "UEC - 8As", "SPM: 5As*")
      const looksLikeGrade = (s) => {
        return /\b(STPM|A-Level|UEC|O-Level|SPM|IGCSE|IB)\b/i.test(s) && 
               /\d+\s*A['s]*/i.test(s); // Contains patterns like "3As", "8A's", "5 As"
      };
      // Detect navigation/menu items (usually short and generic)
      const looksLikeNav = (s) => {
        const lower = s.toLowerCase();
        return (
          s.length < 3 || // Too short
          /^(home|about|contact|apply|login|register|search|filter|browse)$/i.test(lower) ||
          /click here|view|see|more|less/i.test(lower)
        );
      };
      if (Array.isArray(eligibleCourses) && eligibleCourses.length && eligibleCourses[0] !== "All Fields") {
        eligibleCourses = eligibleCourses
          .map(normalizeCourse)
          .filter((s) => s && s.length >= 2 && s.length <= 80)
          .filter((s) => !looksLikeCss(s))
          .filter((s) => !looksLikeGrade(s)) // Filter out grade requirements
          .filter((s) => !looksLikeNav(s)) // Filter out navigation items
          .filter((s) => nonLetterRatio(s) < 0.5)
          .filter((s) => !stopwords.some(w => s.toLowerCase().includes(w)))
          .map((s) => s.replace(/^[-•·\s]+/, ''));
      }

      // AI-FIRST APPROACH: Always use Ollama AI for course extraction (except "All Fields")
      const ollamaEnabled = await isOllamaAvailable();
      // Use globalText for AI (more complete) instead of pageText (may be truncated)
      const textForAI = globalText && globalText.length > pageText.length ? globalText : pageText;
      
      // Only skip AI if we already detected "All Fields" from scraper patterns
      const alreadyDetectedAllFields = eligibleCourses && eligibleCourses.length === 1 && eligibleCourses[0] === "All Fields";
      const shouldUseAI = ollamaEnabled && !alreadyDetectedAllFields && textForAI.length > 500;
      
      if (shouldUseAI) {
        console.log(`   🤖 Using AI to extract eligible courses for ${title}`);
        try {
          const aiCourses = await extractCoursesWithOllama(textForAI, url);
          if (aiCourses && aiCourses.length > 0) {
            eligibleCourses = aiCourses;
            console.log(`   ✓ AI extracted ${aiCourses.length} courses`);
          }
        } catch (aiError) {
          console.error('   ✗ Ollama extraction failed, using scraper result:', aiError.message);
          // Fallback to scraper result if AI fails
        }
      } else if (alreadyDetectedAllFields) {
        console.log(`   ✓ Already detected "All Fields" from patterns, skipping AI`);
      } else if (!ollamaEnabled) {
        console.log(`   ⚠ Ollama not available, using scraper result`);
      }

      // If still empty after all extraction attempts, set to null
      if (!eligibleCourses || eligibleCourses.length === 0) {
        eligibleCourses = null;
      }

      return {
        title,
        deadline: deadlineDate,
        status: "active",
        requirements: {
          minGPA: minGPAFromPage !== null ? minGPAFromPage : null,
          majors: [],
          financialNeed: "any",
          extracurriculars: [],
          achievements: [],
        },
        provider: {
          name: providerName,
          contact: email || "",
          website: websiteSponsor || url,
        },
        sourceUrl: url,
        scrapedAt: new Date(),
        studyLevel,
        studyLevels,
        extractedDeadline: deadline || null,
        contactEmail: email,
        eligibleCourses,
      };
    } catch (error) {
      console.error(`❌ Error scraping ${url}:`, error.message);
      return null;
    }
  }
}

// Test execution
async function runScraper() {
  console.log(
    "🚀 Starting enhanced scholarship scraper with FIXED deadline extraction..."
  );
  const scraper = new ScholarshipScraper();
  try {
    const scholarships = await scraper.scrapeScholarships();
    console.log(`✅ Scraped ${scholarships.length} scholarships`);
  } catch (error) {
    console.error("❌ Scraper failed:", error);
  }
}

module.exports = new ScholarshipScraper();

// Run if this file is executed directly
if (require.main === module) {
  runScraper();
}