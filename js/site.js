/* ============================================================
   SITE CAMILLA ZANOTTI GALLON / ZG BIODIVERSIDADE APLICADA
   Script compartilhado. Índice: grep -n "== SB:" js/site.js

   REGRA QUE GOVERNA O ARQUIVO INTEIRO
   O CSS entrega o estado FINAL, visível, em repouso. O JS só
   ADERE ao movimento, adicionando .sb-motion. JavaScript
   desligado ou movimento reduzido => página estática, completa
   e legível. Nenhum conteúdo depende deste arquivo para existir.

   Restrições do alvo duplo (file:// e artifact publicado):
   sem fetch, sem módulo ES, sem on* inline, sem localStorage.
   ============================================================ */
(function () {
  "use strict";

  var root = document.getElementById("site");
  if (!root) return;

  var mqReduz = window.matchMedia("(prefers-reduced-motion: reduce)");
  var mqPonteiro = window.matchMedia("(hover:hover) and (pointer:fine)");
  var motionOK = !mqReduz.matches;
  var roHeader = null; /* retido: senão o observer pode ser coletado */

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) {
    return Array.prototype.slice.call((c || document).querySelectorAll(s));
  }
  /* cada módulo isolado: um erro não pode derrubar os outros */
  function seguro(nome, fn) {
    try { fn(); } catch (e) {
      if (window.console) console.warn("site · " + nome, e);
    }
  }

  /* ============================================================
     == SB:JS:NAV ==
     ============================================================ */
  function initNav() {
    var hdr = $("#hdr");
    if (!hdr) return;

    /* --header-h sempre correto depois de troca de fonte ou
       rotação; alimenta o scroll-margin-top das âncoras */
    function mediHeader() {
      root.style.setProperty("--header-h", hdr.offsetHeight + "px");
    }
    mediHeader();
    if (window.ResizeObserver) {
      roHeader = new ResizeObserver(mediHeader);
      roHeader.observe(hdr);
    } else {
      window.addEventListener("resize", mediHeader, { passive: true });
    }

    /* estado sólido por sentinela de 1px — zero frames de scroll */
    var sent = $("#sentinela");
    if (window.IntersectionObserver && sent) {
      new IntersectionObserver(function (es) {
        hdr.classList.toggle("is-solid", !es[0].isIntersecting);
      }, { threshold: 0 }).observe(sent);
    }

    /* link da página atual */
    var aqui = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    $$(".hdr-nav a, .menu a").forEach(function (a) {
      var href = (a.getAttribute("href") || "").split("#")[0].toLowerCase();
      if (href && href === aqui) a.setAttribute("aria-current", "page");
    });

    /* âncoras internas: suave só se o usuário aceita movimento */
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (ev) {
        var id = a.getAttribute("href").slice(1);
        if (!id) return;
        var alvo = document.getElementById(id);
        if (!alvo) return;
        ev.preventDefault();
        fecharMenu();
        alvo.scrollIntoView({
          behavior: motionOK ? "smooth" : "auto",
          block: "start"
        });
      });
    });

    /* menu mobile com gestão de foco */
    var burger = $("#burger"), menu = $("#menu"), fechar = $("#menu-fechar");
    if (!burger || !menu) return;
    menu.removeAttribute("hidden");

    function abrir() {
      menu.classList.add("is-open");
      burger.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      var p = menu.querySelector("a");
      if (p) p.focus();
    }
    window.fecharMenu = function () {
      if (!menu.classList.contains("is-open")) return;
      menu.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      burger.focus();
    };
    burger.addEventListener("click", function () {
      menu.classList.contains("is-open") ? fecharMenu() : abrir();
    });
    if (fechar) fechar.addEventListener("click", fecharMenu);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") fecharMenu();
    });
    /* laço de foco enquanto aberto */
    menu.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var f = $$("a,button", menu);
      if (!f.length) return;
      var pri = f[0], ult = f[f.length - 1];
      if (e.shiftKey && document.activeElement === pri) { e.preventDefault(); ult.focus(); }
      else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); pri.focus(); }
    });
  }
  window.fecharMenu = function () {};

  /* ============================================================
     == SB:JS:REVEAL ==
     ============================================================ */
  function initReveal() {
    if (!window.IntersectionObserver || !motionOK) return;
    root.classList.add("js-reveal");

    /* o que já está na primeira tela aparece de imediato: o
       primeiro paint nunca mostra seção vazia esperando o
       observer num aparelho lento */
    var tela = window.innerHeight || 800;
    $$(".reveal").forEach(function (n) {
      if (n.getBoundingClientRect().top < tela * 0.95) n.classList.add("is-in");
    });

    /* data-i="2" vira --i:2, que o CSS usa como atraso escalonado.
       Fica no JS porque o escalonamento só existe quando há JS. */
    $$("[data-i]").forEach(function (n) {
      n.style.setProperty("--i", n.getAttribute("data-i"));
    });

    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });

    $$(".reveal, .escala, .pilar, .esp").forEach(function (n) { io.observe(n); });

    /* rede de segurança: nada fica invisível para sempre */
    setTimeout(function () {
      $$(".reveal:not(.is-in)").forEach(function (n) { n.classList.add("is-in"); });
    }, 1500);

    /* focável dentro de bloco não revelado ainda é focável */
    root.addEventListener("focusin", function (e) {
      var alvo = e.target.closest ? e.target.closest(".reveal:not(.is-in)") : null;
      if (alvo) alvo.classList.add("is-in");
    });
  }

  /* ============================================================
     == SB:JS:SCROLL ==
     UM único listener de scroll no site, coalescido por rAF,
     cuja função é escrever custom properties. Nada mais lê
     scroll direto.
     ============================================================ */
  function initScroll() {
    var pend = false;
    function escreve() {
      pend = false;
      var doc = document.documentElement;
      var alt = doc.scrollHeight - doc.clientHeight;
      root.style.setProperty("--sb-progress", alt > 0 ? (doc.scrollTop / alt).toFixed(4) : 0);
    }
    window.addEventListener("scroll", function () {
      if (pend) return;
      pend = true;
      requestAnimationFrame(escreve);
    }, { passive: true });
    escreve();
  }

  /* ============================================================
     == SB:JS:ABELHAS ==
     Transforms compositados por keyframes gerados em runtime.
     offset-path seria mais expressivo, mas motion-path não está
     no caminho rápido do compositor e travaria durante o scroll.
     ============================================================ */
  var VOO = [
    { sc: .85, bw: "42px", dur: "36s", rx: "22vw", ry: "58vh", rr: "-8deg",
      pts: [[0, "-10vw", "72vh", -14], [28, "22vw", "58vh", -8],
            [56, "52vw", "26vh", 12], [100, "110vw", "20vh", 10]] },
    { sc: .58, bw: "36px", dur: "48s", rx: "68vw", ry: "24vh", rr: "14deg",
      pts: [[0, "106vw", "14vh", 170], [34, "68vw", "24vh", 194],
            [70, "32vw", "12vh", 166], [100, "-12vw", "32vh", 190]] }
  ];

  function initAbelhas() {
    var host = $("#voo");
    if (!host) return;

    var st = document.createElement("style");
    (document.head || root).appendChild(st);
    var folha = st.sheet;

    host.innerHTML = VOO.map(function (v, i) {
      return '<div class="bee" style="--sc:' + v.sc + ";--bw:" + v.bw +
        ";--rx:" + v.rx + ";--ry:" + v.ry + ";--rr:" + v.rr +
        ";animation:sb-voo-" + i + " " + v.dur + " linear infinite" +
        ';color:rgba(247,243,232,.6);--band:#D99B2B">' +
        '<svg viewBox="0 0 48 56"><use href="#sb-abelha-voo"/></svg></div>';
    }).join("");

    VOO.forEach(function (v, i) {
      var kf = v.pts.map(function (p) {
        return p[0] + "%{transform:translate3d(" + p[1] + "," + p[2] +
          ",0) rotate(" + p[3] + "deg) scale(var(--sc,1));" +
          "animation-timing-function:cubic-bezier(.42,0,.58,1)}";
      }).join("");
      try { folha.insertRule("@keyframes sb-voo-" + i + "{" + kf + "}", folha.cssRules.length); }
      catch (e) { /* navegador recusou a regra: as abelhas ficam paradas, e tudo bem */ }
    });

    /* pausa fora da tela: o maior ganho isolado de performance */
    if (window.IntersectionObserver) {
      var alvo = host.closest("section") || host;
      new IntersectionObserver(function (es) {
        var vis = es[0].isIntersecting;
        $$(".bee", host).forEach(function (b) {
          b.style.animationPlayState = vis ? "running" : "paused";
        });
      }, { threshold: 0 }).observe(alvo);
    }
  }

  /* ============================================================
     == SB:JS:CONTEXTO ==
     O formulário já sabe de onde a pessoa veio. Cada CTA leva
     ?oferta=slug, e aqui isso vira texto visível + campo oculto,
     para a mensagem não chegar sem contexto.
     ============================================================ */
  var OFERTAS = {
    "degustacao-equipes":  "Degustação guiada para equipes e eventos",
    "harmonizacao":        "Harmonização de méis",
    "curadoria":           "Curadoria e análise sensorial de méis",
    "jurada":              "Participação como jurada em concursos",
    "formacao-inicial":    "Formação em meliponicultura — introdução",
    "formacao-manejo":     "Formação em meliponicultura — manejo",
    "formacao-sensorial":  "Formação em análise sensorial de méis",
    "colonias":            "Lista de espera — colônias de abelhas nativas",
    "consultoria":         "Projetos e consultoria técnica"
  };

  function initContexto() {
    var cx = $("#contexto");
    if (!cx) return;
    var slug = "";
    try {
      var q = location.search.match(/[?&]oferta=([^&]+)/);
      if (q) slug = decodeURIComponent(q[1]);
    } catch (e) { slug = ""; }

    var nome = OFERTAS[slug];
    if (!nome) { cx.hidden = true; return; }

    cx.hidden = false;
    var alvo = $("#contexto-nome", cx);
    if (alvo) alvo.textContent = nome;
    var campo = $("#campo-oferta");
    if (campo) campo.value = nome;
    var assunto = $("#campo-assunto");
    if (assunto && !assunto.value) assunto.value = nome;
  }

  /* o formulário é mockup: não envia, explica o que aconteceria */
  function initForms() {
    $$("form[data-mock]").forEach(function (f) {
      f.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var aviso = $(".form-aviso", f);
        if (aviso) {
          aviso.hidden = false;
          aviso.setAttribute("tabindex", "-1");
          aviso.focus();
        }
      });
    });
  }

  /* ============================================================
     == SB:JS:BOOT ==
     ============================================================ */
  root.classList.add("js");
  if (motionOK) root.classList.add("sb-motion");

  /* respeita a troca da preferência ao vivo, sem reload */
  function ouve(mq, fn) {
    if (mq.addEventListener) mq.addEventListener("change", fn);
    else if (mq.addListener) mq.addListener(fn);
  }
  ouve(mqReduz, function (e) {
    motionOK = !e.matches;
    root.classList.toggle("sb-motion", motionOK);
  });

  seguro("nav", initNav);
  seguro("reveal", initReveal);
  seguro("scroll", initScroll);
  seguro("abelhas", initAbelhas);
  seguro("contexto", initContexto);
  seguro("forms", initForms);
})();
