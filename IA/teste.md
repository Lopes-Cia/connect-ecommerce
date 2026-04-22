ta muito dificil, eu quero fazer algo que ja foi feito


eu quero implentar esse end-point   {
    method: "POST",
    uri: "/Servidor/webservice/integration/clientes/login",
    auth: {
      mode: "none",
      label: "Sem auth para login de cliente no mock-end.",
    },
    execution: { mode: "mock" },
    handler_class: "api/clientes",
    handler_function: "login",
  },
  que esta no arquivo [text](../../../MICROSERVICE/MOCK-END/PROJETOS/connect/routes.mjs)


  a unica diferença dos outros end-point que ja foram implementados é que esse é um post e os outros get

  ainda nao quero criar uma pagina no front-end para esse end-point, quero apenas criar o teste como os outros teste que existem aqui [text](../app/(shop)/dev/page.tsx)