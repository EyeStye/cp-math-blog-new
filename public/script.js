// API Base URL - Now works with Railway
const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000/api"
    : `${window.location.origin}/api`;

// API Helper Functions
const api = {
  async get(endpoint) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Request failed");
    return response.json();
  },

  async post(endpoint, data) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Request failed");
    }
    return response.json();
  },

  async put(endpoint, data) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Request failed");
    return response.json();
  },

  async delete(endpoint) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) throw new Error("Request failed");
    return response.json();
  },
};

const app = {
  state: {
    posts: [],
    currentView: "home",
    selectedPost: null,
    searchQuery: "",
    filterTag: "all",
    isAuthenticated: false,
    hasPassword: false,
    editingPost: null,
    theme: "light",
    formData: {
      title: "",
      description: "",
      content: "",
      category: "math",
      tags: [],
      difficulty: "medium",
    },
  },

  suggestedTags: {
    math: [
      "algebra",
      "geometry",
      "number-theory",
      "calculus",
      "combinatorics",
      "probability",
      "linear-algebra",
      "graph-theory",
    ],
    cp: [
      "dynamic-programming",
      "greedy",
      "binary-search",
      "graphs",
      "trees",
      "strings",
      "sorting",
      "data-structures",
      "codeforces",
      "leetcode",
      "atcoder",
    ],
  },

  difficultyColors: {
    easy: "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400 dark:border dark:border-green-500/50",
    medium:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border dark:border-yellow-500/50",
    hard: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400 dark:border dark:border-red-500/50",
  },

  setHashForPost(postId) {
    if (!postId) {
      history.pushState(null, "", location.pathname + location.search);
      return;
    }
    const url = new URL(location.href);
    url.hash = `post=${encodeURIComponent(postId)}`;
    history.pushState(null, "", url.toString());
  },

  loadFromHash() {
    const hash = (location.hash || "").replace(/^#/, "");
    const params = new URLSearchParams(hash);
    const postId = params.get("post");
    if (postId) {
      this.viewPost(postId);
    } else {
      // If no hash, show the home view
      if (this.state.selectedPost) {
        this.backToList();
      }
    }
  },

  async init() {
    await this.checkAuth();
    this.loadTheme(); // Now loads from localStorage instead of API
    await this.loadPosts();
    this.loadFromHash();
    window.addEventListener("hashchange", () => this.loadFromHash());
    window.addEventListener("popstate", () => this.loadFromHash());

    this.setupEventListeners();
    this.updateSuggestedTags();
    lucide.createIcons();
  },

  async checkAuth() {
    try {
      const result = await api.get("/auth/check");
      this.state.hasPassword = result.hasPassword;
      this.state.isAuthenticated = result.isAuthenticated;

      if (!this.state.hasPassword) {
        document
          .getElementById("passwordSetupModal")
          .classList.remove("hidden");
      } else {
        document.getElementById("mainApp").classList.remove("hidden");
        this.updateAuthUI();
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      document.getElementById("passwordSetupModal").classList.remove("hidden");
    }
  },

  loadTheme() {
    // Load theme from localStorage instead of database
    const savedTheme = localStorage.getItem("theme");
    this.state.theme = savedTheme || "light";
    this.applyTheme();
  },

  applyTheme() {
    if (this.state.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    this.updateThemeIcon();
  },

  updateThemeIcon() {
    const icon = document.getElementById("themeIcon");
    if (icon) {
      icon.setAttribute(
        "data-lucide",
        this.state.theme === "dark" ? "moon" : "sun",
      );
      lucide.createIcons();
    }
  },

  toggleTheme() {
    // Toggle theme and save to localStorage instead of database
    this.state.theme = this.state.theme === "light" ? "dark" : "light";
    localStorage.setItem("theme", this.state.theme);
    this.applyTheme();
  },

  async setupPassword() {
    const password = document.getElementById("setupPasswordInput").value;
    if (!password || password.length < 4) {
      alert("Password must be at least 4 characters long");
      return;
    }
    try {
      await api.post("/auth/setup", { password });
      this.state.isAuthenticated = true;
      this.state.hasPassword = true;
      document.getElementById("passwordSetupModal").classList.add("hidden");
      document.getElementById("mainApp").classList.remove("hidden");
      this.updateAuthUI();
      alert("Password set successfully! You are now logged in.");
    } catch (error) {
      alert("Failed to set password: " + error.message);
    }
  },

  showLogin() {
    document.getElementById("loginModal").classList.remove("hidden");
    document.getElementById("mainApp").classList.add("hidden");
    setTimeout(
      () => document.getElementById("loginPasswordInput").focus(),
      100,
    );
  },

  async login() {
    const password = document.getElementById("loginPasswordInput").value;
    try {
      await api.post("/auth/login", { password });
      this.state.isAuthenticated = true;
      document.getElementById("loginModal").classList.add("hidden");
      document.getElementById("mainApp").classList.remove("hidden");
      document.getElementById("loginPasswordInput").value = "";
      this.updateAuthUI();
    } catch (error) {
      alert("Incorrect password");
      document.getElementById("loginPasswordInput").value = "";
    }
  },

  cancelLogin() {
    document.getElementById("loginModal").classList.add("hidden");
    document.getElementById("mainApp").classList.remove("hidden");
    document.getElementById("loginPasswordInput").value = "";
  },

  async logout() {
    try {
      await api.post("/auth/logout");
      this.state.isAuthenticated = false;
      this.state.editingPost = null;
      this.setView("home");
      this.updateAuthUI();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  },

  updateAuthUI() {
    if (this.state.isAuthenticated) {
      document.getElementById("newPostBtn").classList.remove("hidden");
      document.getElementById("logoutBtn").classList.remove("hidden");
      document.getElementById("loginBtn").classList.add("hidden");
    } else {
      document.getElementById("newPostBtn").classList.add("hidden");
      document.getElementById("logoutBtn").classList.add("hidden");
      document.getElementById("loginBtn").classList.remove("hidden");
    }
  },

  setupEventListeners() {
    document
      .getElementById("setupPasswordInput")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.setupPassword();
      });

    document
      .getElementById("loginPasswordInput")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.login();
      });

    // Theme toggle
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => this.toggleTheme());
    }

    document
      .getElementById("newPostBtn")
      .addEventListener("click", () => this.handleNewPost());
    document
      .getElementById("loginBtn")
      .addEventListener("click", () => this.showLogin());
    document
      .getElementById("logoutBtn")
      .addEventListener("click", () => this.logout());

    document.getElementById("searchInput").addEventListener("input", (e) => {
      this.state.searchQuery = e.target.value;
      this.renderPostsList();
    });

    document.getElementById("tagFilter").addEventListener("change", (e) => {
      this.state.filterTag = e.target.value;
      this.renderPostsList();
    });

    document.getElementById("postCategory").addEventListener("change", (e) => {
      this.state.formData.category = e.target.value;
      this.state.formData.tags = [];
      this.updateSuggestedTags();
      this.renderSelectedTags();
    });

    document
      .getElementById("customTagInput")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.addCustomTag();
        }
      });
  },

  async loadPosts() {
    try {
      const posts = await api.get("/posts");
      this.state.posts = posts.sort((a, b) => b.timestamp - a.timestamp);
      this.renderPostsList();
      this.updateTagFilter();
    } catch (error) {
      console.log("Loading posts:", error);
    }
  },

  handleNewPost() {
    if (!this.state.isAuthenticated) {
      this.showLogin();
      return;
    }
    this.state.editingPost = null;
    this.state.formData = {
      title: "",
      description: "",
      content: "",
      category: "math",
      tags: [],
      difficulty: "medium",
    };
    this.showPostForm();
  },

  showPostForm() {
    document.getElementById("searchSection").classList.add("hidden");
    document.getElementById("postsList").classList.add("hidden");
    document.getElementById("noPosts").classList.add("hidden");
    document.getElementById("postView").classList.add("hidden");
    document.getElementById("postForm").classList.remove("hidden");

    document.getElementById("formTitle").textContent = this.state.editingPost
      ? "Edit Post"
      : "Create New Post";
    document.getElementById("savePostBtn").textContent = this.state.editingPost
      ? "Update Post"
      : "Publish Post";

    document.getElementById("postTitle").value = this.state.formData.title;
    document.getElementById("postDescription").value =
      this.state.formData.description;
    document.getElementById("postContent").value = this.state.formData.content;
    document.getElementById("postCategory").value =
      this.state.formData.category;
    document.getElementById("postDifficulty").value =
      this.state.formData.difficulty;

    this.updateSuggestedTags();
    this.renderSelectedTags();
  },

  cancelPostForm() {
    this.state.editingPost = null;
    this.setView("home");
  },

  updateSuggestedTags() {
    const container = document.getElementById("suggestedTags");
    const tags = this.suggestedTags[this.state.formData.category];

    container.innerHTML = tags
      .map(
        (tag) => `
      <button
        onclick="app.toggleTag('${tag}')"
        class="px-3 py-1 rounded-full text-sm transition ${
          this.state.formData.tags.includes(tag)
            ? "bg-blue-600 text-white"
            : "bg-gray-100 dark:bg-violet-500/10 dark:border dark:border-violet-500/30 text-gray-700 dark:text-violet-300 hover:bg-gray-200 dark:hover:bg-violet-500/20"
        }"
      >
        ${tag}
      </button>
    `,
      )
      .join("");
  },

  toggleTag(tag) {
    if (this.state.formData.tags.includes(tag)) {
      this.state.formData.tags = this.state.formData.tags.filter(
        (t) => t !== tag,
      );
    } else {
      this.state.formData.tags.push(tag);
    }
    this.updateSuggestedTags();
    this.renderSelectedTags();
  },

  addCustomTag() {
    const input = document.getElementById("customTagInput");
    const tag = input.value.trim();

    if (tag && !this.state.formData.tags.includes(tag)) {
      this.state.formData.tags.push(tag);
      input.value = "";
      this.updateSuggestedTags();
      this.renderSelectedTags();
    }
  },

  removeTag(tag) {
    this.state.formData.tags = this.state.formData.tags.filter(
      (t) => t !== tag,
    );
    this.updateSuggestedTags();
    this.renderSelectedTags();
  },

  renderSelectedTags() {
    const container = document.getElementById("selectedTags");
    const wrapper = document.getElementById("selectedTagsContainer");

    if (this.state.formData.tags.length > 0) {
      wrapper.classList.remove("hidden");
      container.innerHTML = this.state.formData.tags
        .map(
          (tag) => `
        <span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-violet-500/20 dark:border dark:border-violet-500/50 text-blue-800 dark:text-violet-300 rounded-full text-sm">
          ${tag}
          <button onclick="app.removeTag('${tag}')" class="hover:text-blue-900 dark:hover:text-blue-100 ml-1">×</button>
        </span>
      `,
        )
        .join("");
    } else {
      wrapper.classList.add("hidden");
    }
  },

  async savePost() {
    this.state.formData.title = document.getElementById("postTitle").value;
    this.state.formData.description =
      document.getElementById("postDescription").value;
    this.state.formData.content = document.getElementById("postContent").value;
    this.state.formData.category =
      document.getElementById("postCategory").value;
    this.state.formData.difficulty =
      document.getElementById("postDifficulty").value;

    if (
      !this.state.formData.title ||
      !this.state.formData.content ||
      !this.state.formData.description
    ) {
      alert("Please fill in title, description, and content");
      return;
    }

    const post = {
      id: this.state.editingPost?.id || `post_${Date.now()}`,
      title: this.state.formData.title,
      description: this.state.formData.description,
      content: this.state.formData.content,
      category: this.state.formData.category,
      tags: this.state.formData.tags,
      difficulty: this.state.formData.difficulty,
      timestamp: this.state.editingPost?.timestamp || Date.now(),
      updated: Date.now(),
    };

    try {
      if (this.state.editingPost) {
        await api.put(`/posts/${post.id}`, post);
      } else {
        await api.post("/posts", post);
      }
      await this.loadPosts();
      this.state.editingPost = null;
      this.setView("home");
    } catch (error) {
      alert("Failed to save post: " + error.message);
    }
  },

  setView(view) {
    this.state.currentView = view;
    this.state.selectedPost = null;
    this.state.filterTag = "all";
    document.getElementById("tagFilter").value = "all";

    ["navHome", "navMath", "navCp"].forEach((id) => {
      document.getElementById(id).className =
        "group flex items-center px-3 py-2 rounded-lg transition-all duration-300 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-violet-500/10 text-sm sm:text-base overflow-hidden";
    });

    const activeNav =
      view === "home" ? "navHome" : view === "math" ? "navMath" : "navCp";
    document.getElementById(activeNav).className =
      "group flex items-center px-3 py-2 rounded-lg transition-all duration-300 bg-white dark:bg-violet-500/10 dark:border dark:border-violet-500/50 text-blue-600 dark:text-violet-400 text-sm sm:text-base overflow-hidden";

    document.getElementById("searchSection").classList.remove("hidden");
    document.getElementById("postForm").classList.add("hidden");
    document.getElementById("postView").classList.add("hidden");

    this.renderPostsList();
    this.setHashForPost(null);

    lucide.createIcons();
  },

  viewPost(postId) {
    const post = this.state.posts.find((p) => p.id === postId);
    if (!post) return;

    this.state.selectedPost = post;

    document.getElementById("searchSection").classList.add("hidden");
    document.getElementById("postsList").classList.add("hidden");
    document.getElementById("noPosts").classList.add("hidden");
    document.getElementById("postView").classList.remove("hidden");

    document.getElementById("postViewTitle").textContent = post.title;

    const categoryBadge =
      post.category === "math"
        ? '<span class="px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:border dark:border-blue-500/50 dark:text-blue-400">Mathematics</span>'
        : '<span class="px-3 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-violet-500/20 dark:border dark:border-violet-500/50 dark:text-violet-400">Competitive Programming</span>';

    const difficultyBadge = `<span class="px-3 py-1 rounded-full ${this.difficultyColors[post.difficulty]}">${post.difficulty.charAt(0).toUpperCase() + post.difficulty.slice(1)}</span>`;

    const date = this.formatDate(post.timestamp);

    document.getElementById("postViewMeta").innerHTML = `
      ${categoryBadge}
      ${difficultyBadge}
      <div class="flex items-center space-x-1">
        <i data-lucide="calendar" style="width: 16px; height: 16px;"></i>
        <span>${date}</span>
      </div>
    `;

    document.getElementById("postViewTags").innerHTML = post.tags
      .map(
        (tag) => `
      <span class="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-violet-500/20 dark:to-purple-500/20 dark:border dark:border-violet-500/50 text-blue-800 dark:text-violet-300 text-sm rounded-full font-medium">
        ${tag}
      </span>
    `,
      )
      .join("");

    document.getElementById("postViewContent").innerHTML = this.parseContent(
      post.content,
    );

    if (this.state.isAuthenticated) {
      document.getElementById("postActions").classList.remove("hidden");
    } else {
      document.getElementById("postActions").classList.add("hidden");
    }

    lucide.createIcons();
    this.renderMathAndCode();
    this.setHashForPost(postId);
  },

  parseContent(content) {
    const lines = content.replace(/\r\n/g, "\n").split("\n");
    const out = [];

    let inCode = false;
    let codeLang = "text";
    let codeBuf = [];

    let paraBuf = [];
    let inUl = false;
    let inOl = false;

    const flushPara = () => {
      if (paraBuf.length === 0) return;
      const html = paraBuf.map((l) => this.escapeHtml(l)).join("<br>");
      out.push(`<p class="my-3">${html}</p>`);
      paraBuf = [];
    };

    const closeLists = () => {
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("```")) {
        if (!inCode) {
          flushPara();
          closeLists();
          inCode = true;
          codeLang = line.slice(3).trim() || "text";
          codeBuf = [];
        } else {
          out.push(
            `<pre class="my-4 rounded-lg overflow-auto"><code class="language-${this.escapeHtml(codeLang)}">${this.escapeHtml(codeBuf.join("\n"))}</code></pre>`,
          );
          inCode = false;
          codeBuf = [];
          codeLang = "text";
        }
        continue;
      }

      if (inCode) {
        codeBuf.push(line);
        continue;
      }

      const trimmed = line.trim();

      if (trimmed === "") {
        flushPara();
        closeLists();
        continue;
      }

      const hMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
      if (hMatch) {
        flushPara();
        closeLists();
        const level = hMatch[1].length;
        const text = this.escapeHtml(hMatch[2]);
        const cls =
          level === 1
            ? "text-2xl font-bold mt-6 mb-2"
            : level === 2
              ? "text-xl font-bold mt-5 mb-2"
              : "text-lg font-semibold mt-4 mb-2";
        out.push(`<h${level} class="${cls}">${text}</h${level}>`);
        continue;
      }

      const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
      if (ulMatch) {
        flushPara();
        if (inOl) {
          out.push("</ol>");
          inOl = false;
        }
        if (!inUl) {
          out.push(`<ul class="list-disc pl-6 my-3 space-y-1">`);
          inUl = true;
        }
        out.push(`<li>${this.escapeHtml(ulMatch[1])}</li>`);
        continue;
      }

      const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
      if (olMatch) {
        flushPara();
        if (inUl) {
          out.push("</ul>");
          inUl = false;
        }
        if (!inOl) {
          out.push(`<ol class="list-decimal pl-6 my-3 space-y-1">`);
          inOl = true;
        }
        out.push(`<li>${this.escapeHtml(olMatch[1])}</li>`);
        continue;
      }

      paraBuf.push(line);
    }

    if (!inCode) {
      flushPara();
      closeLists();
    } else {
      out.push(
        `<pre class="my-4 rounded-lg overflow-auto"><code class="language-${this.escapeHtml(codeLang)}">${this.escapeHtml(codeBuf.join("\n"))}</code></pre>`,
      );
    }

    return out.join("");
  },

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  renderMathAndCode() {
    setTimeout(() => {
      const contentElement = document.getElementById("postViewContent");
      if (contentElement && window.renderMathInElement) {
        renderMathInElement(contentElement, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\[", right: "\\]", display: true },
            { left: "\\(", right: "\\)", display: false },
          ],
          throwOnError: false,
        });
      }
      if (window.Prism) {
        Prism.highlightAll();
      }
    }, 100);
  },

  backToList() {
    this.state.selectedPost = null;
    document.getElementById("searchSection").classList.remove("hidden");
    document.getElementById("postView").classList.add("hidden");
    this.renderPostsList();
    this.setHashForPost(null);
  },

  editCurrentPost() {
    if (!this.state.isAuthenticated) {
      this.showLogin();
      return;
    }

    const post = this.state.selectedPost;
    this.state.editingPost = post;
    this.state.formData = {
      title: post.title,
      description: post.description,
      content: post.content,
      category: post.category,
      tags: [...post.tags],
      difficulty: post.difficulty,
    };
    this.showPostForm();
  },

  async deleteCurrentPost() {
    if (!confirm("Are you sure you want to delete this post?")) return;

    const postId = this.state.selectedPost.id;
    try {
      await api.delete(`/posts/${postId}`);
      await this.loadPosts();
      this.setView("home");
    } catch (error) {
      alert("Failed to delete post");
    }
  },

  renderPostsList() {
    const container = document.getElementById("postsList");
    const filteredPosts = this.getFilteredPosts();

    if (filteredPosts.length === 0) {
      container.classList.add("hidden");
      document.getElementById("noPosts").classList.remove("hidden");
      lucide.createIcons();
      return;
    }

    container.classList.remove("hidden");
    document.getElementById("noPosts").classList.add("hidden");

    container.innerHTML = filteredPosts
      .map(
        (post) => `
      <div
        onclick="app.viewPost('${post.id}')"
        class="bg-white dark:bg-black dark:border dark:border-violet-500/30 dark:hover:border-violet-500/50 rounded-xl shadow-sm p-6 hover:shadow-md transition cursor-pointer"
      >
        <div class="flex items-start justify-between mb-3">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-violet-400 transition">
            ${post.title}
          </h2>
          <span class="px-3 py-1 rounded-full text-sm ${this.difficultyColors[post.difficulty]}">
            ${post.difficulty}
          </span>
        </div>
        <p class="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
          ${post.description}
        </p>
        <div class="flex items-center justify-between">
          <div class="flex flex-wrap gap-2">
            <span class="px-2 py-1 rounded text-xs ${post.category === "math" ? "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:border dark:border-blue-500/50 dark:text-blue-400" : "bg-purple-100 text-purple-800 dark:bg-violet-500/20 dark:border dark:border-violet-500/50 dark:text-violet-400"}">
              ${post.category === "math" ? "Math" : "CP"}
            </span>
            ${post.tags
              .slice(0, 4)
              .map(
                (tag) => `
              <span class="px-2 py-1 bg-gray-100 dark:bg-violet-500/10 dark:border dark:border-violet-500/30 text-gray-700 dark:text-violet-300 text-xs rounded">
                ${tag}
              </span>
            `,
              )
              .join("")}
            ${
              post.tags.length > 4
                ? `
              <span class="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded">
                +${post.tags.length - 4}
              </span>
            `
                : ""
            }
          </div>
          <div class="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
            <i data-lucide="clock" style="width: 14px; height: 14px;"></i>
            <span>${this.formatDate(post.timestamp)}</span>
          </div>
        </div>
      </div>
    `,
      )
      .join("");

    lucide.createIcons();
  },

  getFilteredPosts() {
    return this.state.posts.filter((post) => {
      const matchesView =
        this.state.currentView === "home" ||
        post.category === this.state.currentView;
      const matchesSearch =
        post.title
          .toLowerCase()
          .includes(this.state.searchQuery.toLowerCase()) ||
        post.description
          .toLowerCase()
          .includes(this.state.searchQuery.toLowerCase()) ||
        post.content
          .toLowerCase()
          .includes(this.state.searchQuery.toLowerCase());
      const matchesTag =
        this.state.filterTag === "all" ||
        post.tags.includes(this.state.filterTag);
      return matchesView && matchesSearch && matchesTag;
    });
  },

  updateTagFilter() {
    const allTags = [...new Set(this.state.posts.flatMap((p) => p.tags))];
    const select = document.getElementById("tagFilter");

    select.innerHTML =
      '<option value="all">All Tags</option>' +
      allTags.map((tag) => `<option value="${tag}">${tag}</option>`).join("");
  },

  formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  },
};

document.addEventListener("DOMContentLoaded", () => {
  app.init();
});
