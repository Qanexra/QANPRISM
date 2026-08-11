use serde::{Deserialize, Serialize};
use std::sync::{Mutex, OnceLock};
use std::fs::OpenOptions;
use std::io::Write;
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use std::collections::HashMap;


// Shared persistent HTTP client with cookie jar for the qanprism:// proxy
static PROXY_CLIENT: OnceLock<reqwest::blocking::Client> = OnceLock::new();

fn get_proxy_client() -> &'static reqwest::blocking::Client {
    PROXY_CLIENT.get_or_init(|| {
        reqwest::blocking::Client::builder()
            .cookie_store(true)
            .redirect(reqwest::redirect::Policy::none())
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
            .build()
            .unwrap()
    })
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PageResponse {
    pub html: String,
    pub url: String,
    pub status: u16,
    pub cookies: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ApiResponse {
    pub status: u16,
    pub status_text: String,
    pub body: String,
    pub headers: HashMap<String, String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LogEntry {
    pub id: String,
    pub timestamp: String,
    pub level: String,     // INFO, WARN, ERROR, NETWORK, AGENT
    pub category: String,  // Fetch, Navigation, Script, DOM, Agent, API
    pub message: String,
    pub details: Option<String>,
}

static CLIENT: OnceLock<reqwest::blocking::Client> = OnceLock::new();
static LOG_BUFFER: OnceLock<Mutex<Vec<LogEntry>>> = OnceLock::new();
static COOKIE_JAR: OnceLock<Mutex<HashMap<String, HashMap<String, String>>>> = OnceLock::new();

fn get_client() -> &'static reqwest::blocking::Client {
    CLIENT.get_or_init(|| {
        reqwest::blocking::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 QanPrism/1.0")
            .timeout(std::time::Duration::from_secs(20))
            .cookie_store(true)
            .build()
            .expect("Failed to initialize persistent HTTP client")
    })
}

fn get_log_buffer() -> &'static Mutex<Vec<LogEntry>> {
    LOG_BUFFER.get_or_init(|| Mutex::new(Vec::with_capacity(500)))
}

fn get_cookie_jar() -> &'static Mutex<HashMap<String, HashMap<String, String>>> {
    COOKIE_JAR.get_or_init(|| Mutex::new(HashMap::new()))
}

fn save_response_cookies(url_str: &str, headers: &reqwest::header::HeaderMap) {
    let domain = if let Ok(parsed_url) = reqwest::Url::parse(url_str) {
        parsed_url.host_str().unwrap_or("").to_string()
    } else {
        return;
    };

    if let Ok(mut jar) = get_cookie_jar().lock() {
        let domain_cookies = jar.entry(domain.clone()).or_insert_with(HashMap::new);
        for cookie_header in headers.get_all(reqwest::header::SET_COOKIE) {
            if let Ok(cookie_str) = cookie_header.to_str() {
                if let Some(first_part) = cookie_str.split(';').next() {
                    let mut kv = first_part.splitn(2, '=');
                    if let (Some(k), Some(v)) = (kv.next(), kv.next()) {
                        let k_clean = k.trim().to_string();
                        let v_clean = v.trim().to_string();
                        if !k_clean.is_empty() {
                            domain_cookies.insert(k_clean, v_clean);
                        }
                    }
                }
            }
        }
    }
}

fn get_cookies_for_url(url_str: &str) -> String {
    let host = if let Ok(parsed_url) = reqwest::Url::parse(url_str) {
        parsed_url.host_str().unwrap_or("").to_string()
    } else {
        return String::new();
    };

    let mut result_map = HashMap::new();
    if let Ok(jar) = get_cookie_jar().lock() {
        for (domain, cookies) in jar.iter() {
            if host.ends_with(domain) || domain.ends_with(&host) || host == *domain {
                for (k, v) in cookies {
                    result_map.insert(k.clone(), v.clone());
                }
            }
        }
    }

    result_map.iter().map(|(k, v)| format!("{}={}", k, v)).collect::<Vec<_>>().join("; ")
}

fn get_current_timestamp() -> String {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    let secs = now.as_secs();
    let millis = now.subsec_millis();
    format!("{}.{:03}Z", secs, millis)
}

fn append_to_disk_log(entry: &LogEntry) {
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open("qanprism_debug.log") {
        let line = format!(
            "[{}] [{}] [{}] {} {}\n",
            entry.timestamp,
            entry.level,
            entry.category,
            entry.message,
            entry.details.as_deref().unwrap_or("")
        );
        let _ = file.write_all(line.as_bytes());
    }
}

fn internal_log(level: &str, category: &str, message: &str, details: Option<&str>) {
    let entry = LogEntry {
        id: format!("log-{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_nanos()),
        timestamp: get_current_timestamp(),
        level: level.to_string(),
        category: category.to_string(),
        message: message.to_string(),
        details: details.map(|s| s.to_string()),
    };

    append_to_disk_log(&entry);

    if let Ok(mut buffer) = get_log_buffer().lock() {
        if buffer.len() >= 500 {
            buffer.remove(0);
        }
        buffer.push(entry);
    }
}

#[tauri::command]
fn log_event(level: String, category: String, message: String, details: Option<String>) -> Result<(), String> {
    internal_log(&level, &category, &message, details.as_deref());
    Ok(())
}

#[tauri::command]
fn get_debug_logs() -> Result<Vec<LogEntry>, String> {
    let buffer = get_log_buffer().lock().map_err(|e| e.to_string())?;
    Ok(buffer.clone())
}

#[tauri::command]
fn clear_debug_logs() -> Result<(), String> {
    if let Ok(mut buffer) = get_log_buffer().lock() {
        buffer.clear();
    }
    let _ = std::fs::remove_file("qanprism_debug.log");
    internal_log("INFO", "System", "Debug logs cleared by user", None);
    Ok(())
}

#[tauri::command]
fn fetch_page_context(url: String) -> Result<PageResponse, String> {
    let start_time = Instant::now();
    internal_log("NETWORK", "Fetch", &format!("Initiating request -> {}", url), None);

    let client = get_client();

    let response_result = client.get(&url)
        .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
        .header("Accept-Language", "en-US,en;q=0.9,vi;q=0.8")
        .header("Sec-Fetch-Dest", "document")
        .header("Sec-Fetch-Mode", "navigate")
        .header("Sec-Fetch-Site", "none")
        .header("Sec-Fetch-User", "?1")
        .header("Upgrade-Insecure-Requests", "1")
        .send();

    let response = match response_result {
        Ok(resp) => resp,
        Err(err) => {
            let elapsed = start_time.elapsed().as_millis();
            let err_msg = format!("HTTP Request failed after {}ms: {}", elapsed, err);
            internal_log("ERROR", "Fetch", &err_msg, Some(&url));
            return Err(err_msg);
        }
    };

    let final_url = response.url().to_string();
    let status = response.status().as_u16();
    let elapsed = start_time.elapsed().as_millis();

    save_response_cookies(&final_url, response.headers());

    let html = match response.text() {
        Ok(text) => text,
        Err(err) => {
            let err_msg = format!("Failed to read response body: {}", err);
            internal_log("ERROR", "Fetch", &err_msg, Some(&final_url));
            return Err(err_msg);
        }
    };

    let size_kb = (html.len() as f64) / 1024.0;
    let log_level = if status >= 400 { "WARN" } else { "NETWORK" };
    let redirect_info = if final_url != url {
        Some(format!("Redirected from: {}", url))
    } else {
        None
    };

    internal_log(
        log_level,
        "Fetch",
        &format!("Status: {} ({}ms, {:.1} KB) -> {}", status, elapsed, size_kb, final_url),
        redirect_info.as_deref()
    );

    let cookies = get_cookies_for_url(&final_url);

    Ok(PageResponse {
        html,
        url: final_url,
        status,
        cookies,
    })
}

#[tauri::command]
fn submit_form_context(
    url: String,
    method: String,
    form_data: HashMap<String, String>,
) -> Result<PageResponse, String> {
    let start_time = Instant::now();
    internal_log("NETWORK", "FormSubmit", &format!("Submitting {} request to -> {}", method.to_uppercase(), url), None);

    let client = get_client();

    let request_builder = if method.to_uppercase() == "POST" {
        client.post(&url).form(&form_data)
    } else {
        client.get(&url).query(&form_data)
    };

    let response_result = request_builder
        .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
        .header("Accept-Language", "en-US,en;q=0.9,vi;q=0.8")
        .header("Sec-Fetch-Dest", "document")
        .header("Sec-Fetch-Mode", "navigate")
        .header("Sec-Fetch-Site", "same-origin")
        .header("Sec-Fetch-User", "?1")
        .header("Upgrade-Insecure-Requests", "1")
        .header("Referer", &url)
        .send();

    let response = match response_result {
        Ok(resp) => resp,
        Err(err) => {
            let elapsed = start_time.elapsed().as_millis();
            let err_msg = format!("Form submission failed after {}ms: {}", elapsed, err);
            internal_log("ERROR", "FormSubmit", &err_msg, Some(&url));
            return Err(err_msg);
        }
    };

    let final_url = response.url().to_string();
    let status = response.status().as_u16();
    let elapsed = start_time.elapsed().as_millis();

    save_response_cookies(&final_url, response.headers());

    let html = match response.text() {
        Ok(text) => text,
        Err(err) => {
            let err_msg = format!("Failed to read form response body: {}", err);
            internal_log("ERROR", "FormSubmit", &err_msg, Some(&final_url));
            return Err(err_msg);
        }
    };

    let size_kb = (html.len() as f64) / 1024.0;
    let log_level = if status >= 400 { "WARN" } else { "NETWORK" };
    let redirect_info = if final_url != url {
        Some(format!("Redirected from: {}", url))
    } else {
        None
    };

    internal_log(
        log_level,
        "FormSubmit",
        &format!("Status: {} ({}ms, {:.1} KB) -> {}", status, elapsed, size_kb, final_url),
        redirect_info.as_deref()
    );

    let cookies = get_cookies_for_url(&final_url);

    Ok(PageResponse {
        html,
        url: final_url,
        status,
        cookies,
    })
}

#[tauri::command]
fn fetch_api_context(
    url: String,
    method: String,
    headers: HashMap<String, String>,
    body: Option<String>,
) -> Result<ApiResponse, String> {
    let client = get_client();
    let method_upper = method.to_uppercase();

    let mut req = match method_upper.as_str() {
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        "PATCH" => client.patch(&url),
        _ => client.get(&url),
    };

    for (k, v) in headers {
        if !k.eq_ignore_ascii_case("host") && !k.eq_ignore_ascii_case("content-length") {
            req = req.header(k, v);
        }
    }

    if let Some(b) = body {
        req = req.body(b);
    }

    let response = req.send().map_err(|e| e.to_string())?;

    let status = response.status().as_u16();
    let status_text = response.status().canonical_reason().unwrap_or("OK").to_string();
    
    save_response_cookies(&url, response.headers());

    let mut resp_headers = HashMap::new();
    for (k, v) in response.headers() {
        if let Ok(val_str) = v.to_str() {
            resp_headers.insert(k.as_str().to_string(), val_str.to_string());
        }
    }

    let body_text = response.text().unwrap_or_default();

    Ok(ApiResponse {
        status,
        status_text,
        body: body_text,
        headers: resp_headers,
    })
}

// Legacy webview commands removed as architecture has migrated to qanprism:// protocol

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .register_uri_scheme_protocol("qanprism", move |_app, request| {
        let path = request.uri().path().strip_prefix('/').unwrap_or(request.uri().path());
        
        let mut target_url = String::new();
        
        // Check if path is URL-encoded full URL
        if path.starts_with("http%3A") || path.starts_with("https%3A") {
            // It's the root iframe request
            if let Ok(decoded) = urlencoding::decode(path) {
                target_url = decoded.into_owned();
            }
        } else {
            // It's a relative request, check Referer
            let mut referer_str = String::new();
            if let Some(r) = request.headers().get("referer") {
                if let Ok(r_str) = r.to_str() {
                    referer_str = r_str.to_string();
                }
            }
            
            if !referer_str.is_empty() {
                if let Ok(ref_url) = reqwest::Url::parse(&referer_str) {
                    let ref_path = ref_url.path().strip_prefix('/').unwrap_or("");
                    if ref_path.starts_with("http%3A") || ref_path.starts_with("https%3A") {
                        if let Ok(decoded_ref) = urlencoding::decode(ref_path) {
                            if let Ok(base_url) = reqwest::Url::parse(&decoded_ref) {
                                // Reconstruct the full URL
                                let mut final_url = base_url.clone();
                                final_url.set_path(path);
                                if let Some(query) = request.uri().query() {
                                    final_url.set_query(Some(query));
                                }
                                target_url = final_url.to_string();
                            }
                        }
                    }
                }
            }
        }
        
        if target_url.is_empty() {
            return tauri::http::Response::builder()
                .status(400)
                .body(b"Bad Request: Missing Target URL or Referer".to_vec())
                .unwrap();
        }

        println!("Native Proxy Fetching: {}", target_url);

        let client = get_proxy_client();

        let method_str = request.method().as_str();
        let req_method = reqwest::Method::from_bytes(method_str.as_bytes()).unwrap_or(reqwest::Method::GET);
        let mut req_builder = client.request(req_method, &target_url);

        // Forward headers safely
        for (k, v) in request.headers() {
            let k_lower = k.as_str().to_lowercase();
            if k_lower != "host" && k_lower != "origin" && k_lower != "referer" && k_lower != "sec-fetch-site" {
                if let Ok(v_str) = v.to_str() {
                    req_builder = req_builder.header(k.as_str(), v_str);
                }
            }
        }

        // Add proper origin and referer for the target site to prevent CSRF blocks
        if let Ok(parsed_target) = reqwest::Url::parse(&target_url) {
            let origin = format!("{}://{}", parsed_target.scheme(), parsed_target.host_str().unwrap_or(""));
            req_builder = req_builder.header("Origin", origin);
            req_builder = req_builder.header("Referer", &target_url);
        }

        // Forward the request body (critical for POST form submissions like login!)
        let body = request.body().to_vec();
        if !body.is_empty() {
            println!("  -> Forwarding {} bytes of request body", body.len());
            req_builder = req_builder.body(body);
        }

        if let Ok(response) = req_builder.send() {
            let mut builder = tauri::http::Response::builder()
                .status(response.status().as_u16());

            // Capture content-type for HTML rewriting decision later
            let builder_content_type = response.headers()
                .get("content-type")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("")
                .to_lowercase();

            for (k, v) in response.headers() {
                let k_lower = k.as_str().to_lowercase();
                // Strip CORS blocks
                if k_lower == "x-frame-options" || k_lower == "content-security-policy" || k_lower == "content-security-policy-report-only" || k_lower == "cross-origin-opener-policy" {
                    continue;
                }
                
                // Rewrite Location headers to keep redirects inside the proxy!
                if k_lower == "location" {
                    if let Ok(loc_str) = v.to_str() {
                        let mut next_url = loc_str.to_string();
                        if loc_str.starts_with('/') {
                            if let Ok(parsed_target) = reqwest::Url::parse(&target_url) {
                                let mut absolute_loc = parsed_target.clone();
                                absolute_loc.set_path(loc_str);
                                next_url = absolute_loc.to_string();
                            }
                        }
                        // Encode the target URL and point it back to qanprism.localhost
                        let encoded_loc = urlencoding::encode(&next_url);
                        builder = builder.header(k.as_str(), format!("/{}", encoded_loc));
                        continue;
                    }
                }
                if let Ok(v_str) = v.to_str() {
                    builder = builder.header(k.as_str(), v_str);
                }
            }

            let bytes = response.bytes().unwrap_or_default().to_vec();
            
            // Check if this is an HTML response — if so, rewrite URLs to keep navigation inside our proxy
            let content_type = builder_content_type.clone();
            let final_body = if content_type.contains("text/html") {
                if let Ok(mut html) = String::from_utf8(bytes.clone()) {
                    // Rewrite absolute URLs for LinkedIn and its CDN domains to route through our proxy
                    let domains_to_rewrite = vec![
                        "https://www.linkedin.com",
                        "https://static.licdn.com",
                        "https://static-exp1.licdn.com",
                        "https://static-exp2.licdn.com",
                        "https://media.licdn.com",
                        "https://platform.linkedin.com",
                        "https://www.google.com",
                        "https://accounts.google.com",
                    ];
                    
                    for domain in &domains_to_rewrite {
                        let encoded = urlencoding::encode(domain);
                        // Rewrite href="https://..." and src="https://..." etc
                        let proxy_url = format!("http://qanprism.localhost/{}", encoded);
                        html = html.replace(domain, &proxy_url);
                    }
                    
                    // Inject our navigation interceptor script right after <head>
                    let interceptor = r#"<script data-qp-injected="true">
(function() {
  // Rewrite any URL to go through our proxy
  function proxyUrl(url) {
    if (!url || typeof url !== 'string') return url;
    var s = url.trim();
    if (s.startsWith('http://qanprism.localhost/')) return s;
    if (s.startsWith('https://') || s.startsWith('http://')) {
      return 'http://qanprism.localhost/' + encodeURIComponent(s);
    }
    return url;
  }

  // Intercept fetch()
  var origFetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string') {
      input = proxyUrl(input);
    } else if (input && input.url) {
      input = new Request(proxyUrl(input.url), input);
    }
    return origFetch.call(this, input, init);
  };

  // Intercept XMLHttpRequest.open
  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    arguments[1] = proxyUrl(url);
    return origOpen.apply(this, arguments);
  };

  // Intercept window.location assignments
  var locationProxy = new Proxy(window.location, {
    set: function(target, prop, value) {
      if (prop === 'href') {
        target.href = proxyUrl(value);
        return true;
      }
      target[prop] = value;
      return true;
    }
  });

  // Intercept link clicks
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (a && a.href && !a.href.startsWith('http://qanprism.localhost/') && !a.href.startsWith('javascript:')) {
      e.preventDefault();
      window.location.href = proxyUrl(a.href);
    }
  }, true);

  // Intercept form submissions
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form && form.action && !form.action.startsWith('http://qanprism.localhost/')) {
      form.action = proxyUrl(form.action);
    }
  }, true);
})();
</script>"#;
                    
                    // Insert after <head> or at the very start
                    if let Some(pos) = html.find("<head>") {
                        html.insert_str(pos + 6, interceptor);
                    } else if let Some(pos) = html.find("<head ") {
                        // Find the closing > of <head ...>
                        if let Some(end) = html[pos..].find('>') {
                            html.insert_str(pos + end + 1, interceptor);
                        }
                    } else if let Some(pos) = html.find("<HEAD>") {
                        html.insert_str(pos + 6, interceptor);
                    } else {
                        // Prepend it
                        html = format!("{}{}", interceptor, html);
                    }
                    
                    html.into_bytes()
                } else {
                    bytes
                }
            } else {
                bytes
            };
            
            builder.body(final_body).unwrap_or_else(|_| {
                tauri::http::Response::builder().status(500).body(b"Internal Error".to_vec()).unwrap()
            })
        } else {
            tauri::http::Response::builder().status(502).body(b"Bad Gateway".to_vec()).unwrap()
        }
    })
    .invoke_handler(tauri::generate_handler![
        fetch_page_context,
        submit_form_context,
        fetch_api_context,
        log_event,
        get_debug_logs,
        clear_debug_logs
    ])
    .setup(|app| {
      internal_log("INFO", "Lifecycle", "QanPrism Core Engine initialized", None);
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
