// Este componente contém os campos de configuração da loja que são relevantes para o lojista
import { FiMapPin, FiClock, FiPhone, FiImage, FiMail, FiGlobe, FiUser, FiCreditCard, FiTruck, FiTag, FiPieChart, FiInfo } from 'react-icons/fi';

// Campos de configuração para o lojista
export const lojistaConfigFields = [
  {
    section: "informacoes_basicas",
    title: "Informações Básicas",
    icon: <FiInfo />,
    description: "Informações gerais sobre sua loja",
    fields: [
      {
        id: "nome_loja",
        label: "Nome da Loja",
        type: "text",
        required: true,
        icon: <FiTag />,
        placeholder: "Nome da sua loja",
        description: "Nome público da sua loja, exibido para clientes",
      },
      {
        id: "logo_url",
        label: "Logo da Loja",
        type: "image",
        required: false,
        icon: <FiImage />,
        description: "Logotipo da sua loja (formato PNG ou JPG, máx. 2MB)",
      },
      {
        id: "slogan",
        label: "Slogan",
        type: "text",
        required: false,
        placeholder: "Uma frase que define sua loja",
        description: "Frase curta que aparece junto com o nome da loja",
      },
      {
        id: "descricao",
        label: "Descrição da Loja",
        type: "textarea",
        required: false,
        placeholder: "Descreva brevemente sua loja...",
        description: "Descrição mais detalhada sobre sua loja",
      }
    ]
  },
  {
    section: "contato",
    title: "Contato e Endereço",
    icon: <FiPhone />,
    description: "Dados de contato e localização da loja",
    fields: [
      {
        id: "telefone",
        label: "Telefone",
        type: "text", 
        required: true,
        icon: <FiPhone />,
        placeholder: "(11) 98765-4321",
        description: "Telefone principal para contato da loja",
      },
      {
        id: "whatsapp",
        label: "WhatsApp",
        type: "text",
        required: false,
        placeholder: "(11) 98765-4321",
        description: "Número de WhatsApp para atendimento (se diferente do telefone)",
      },
      {
        id: "email",
        label: "E-mail",
        type: "email",
        required: true,
        icon: <FiMail />,
        placeholder: "contato@sualoja.com.br",
        description: "E-mail principal para contato",
      },
      {
        id: "endereco",
        label: "Endereço",
        type: "text",
        required: true,
        icon: <FiMapPin />,
        placeholder: "Av. Brasil, 1500 - Centro",
        description: "Endereço físico da loja",
      },
      {
        id: "cidade_estado",
        label: "Cidade/Estado",
        type: "text",
        required: true,
        placeholder: "São Paulo - SP",
        description: "Cidade e estado onde a loja está localizada",
      },
      {
        id: "cep",
        label: "CEP",
        type: "text",
        required: true,
        placeholder: "12345-678",
        description: "CEP da localização da loja",
      }
    ]
  },
  {
    section: "funcionamento",
    title: "Funcionamento",
    icon: <FiClock />,
    description: "Horários de funcionamento e políticas da loja",
    fields: [
      {
        id: "horario_funcionamento",
        label: "Horário de Funcionamento",
        type: "textarea",
        required: true,
        icon: <FiClock />,
        placeholder: "Segunda a Sexta: 9h às 18h\nSábado: 9h às 13h",
        description: "Horários em que sua loja está aberta",
      },
      {
        id: "prazo_entrega",
        label: "Prazo Médio de Entrega",
        type: "text",
        required: true,
        icon: <FiTruck />,
        placeholder: "3-5 dias úteis",
        description: "Prazo médio para entrega dos produtos",
      },
      {
        id: "politica_devolucao",
        label: "Política de Devolução",
        type: "textarea",
        required: false,
        placeholder: "Troca em até 7 dias após o recebimento...",
        description: "Regras para devolução e troca de produtos",
      }
    ]
  },
  {
    section: "pagamento",
    title: "Formas de Pagamento",
    icon: <FiCreditCard />,
    description: "Opções de pagamento aceitas",
    fields: [
      {
        id: "formas_pagamento",
        label: "Formas de Pagamento Aceitas",
        type: "multiselect",
        required: true,
        icon: <FiCreditCard />,
        options: [
          { value: "credito", label: "Cartão de Crédito" },
          { value: "debito", label: "Cartão de Débito" },
          { value: "boleto", label: "Boleto Bancário" },
          { value: "pix", label: "PIX" },
          { value: "dinheiro", label: "Dinheiro" },
          { value: "transferencia", label: "Transferência Bancária" }
        ],
        description: "Selecione todas as formas de pagamento que você aceita",
      },
      {
        id: "parcelamento",
        label: "Opções de Parcelamento",
        type: "text",
        required: false,
        placeholder: "Até 12x sem juros",
        description: "Política de parcelamento da loja",
      }
    ]
  },
  {
    section: "redes_sociais",
    title: "Redes Sociais",
    icon: <FiGlobe />,
    description: "Perfis da loja nas redes sociais",
    fields: [
      {
        id: "instagram",
        label: "Instagram",
        type: "text",
        required: false,
        placeholder: "@sualoja",
        description: "Nome de usuário no Instagram",
      },
      {
        id: "facebook",
        label: "Facebook",
        type: "text",
        required: false,
        placeholder: "facebook.com/sualoja",
        description: "URL da página no Facebook",
      },
      {
        id: "tiktok",
        label: "TikTok",
        type: "text",
        required: false,
        placeholder: "@sualoja",
        description: "Nome de usuário no TikTok",
      },
      {
        id: "site",
        label: "Site",
        type: "text",
        required: false,
        icon: <FiGlobe />,
        placeholder: "www.sualoja.com.br",
        description: "Site oficial da loja (se existir)",
      }
    ]
  },
  {
    section: "personalizacao",
    title: "Personalização",
    icon: <FiTag />,
    description: "Personalize a aparência da sua loja online",
    fields: [
      {
        id: "cor_primaria",
        label: "Cor Primária",
        type: "color",
        required: false,
        defaultValue: "#3B82F6",
        description: "Cor principal da sua loja",
      },
      {
        id: "cor_secundaria",
        label: "Cor Secundária",
        type: "color",
        required: false,
        defaultValue: "#1E3A8A",
        description: "Cor secundária da sua loja",
      },
      {
        id: "banner_url",
        label: "Banner da Loja",
        type: "image",
        required: false,
        description: "Banner principal para a página inicial (1200x400px)",
      }
    ]
  },
  {
    section: "fiscal",
    title: "Informações Fiscais",
    icon: <FiPieChart />,
    description: "Informações fiscais da sua loja",
    fields: [
      {
        id: "razao_social",
        label: "Razão Social",
        type: "text",
        required: true,
        placeholder: "Empresa LTDA",
        description: "Nome registrado da empresa",
      },
      {
        id: "cnpj",
        label: "CNPJ",
        type: "text",
        required: true,
        placeholder: "12.345.678/0001-90",
        description: "CNPJ da empresa",
      },
      {
        id: "inscricao_estadual",
        label: "Inscrição Estadual",
        type: "text",
        required: false,
        placeholder: "123456789",
        description: "Inscrição estadual (se aplicável)",
      }
    ]
  }
];

// Função auxiliar para obter todos os campos em um formato plano
export const getAllFields = () => {
  const allFields = [];
  
  lojistaConfigFields.forEach(section => {
    section.fields.forEach(field => {
      allFields.push({
        ...field,
        section: section.section
      });
    });
  });
  
  return allFields;
};

// Função para obter um campo específico pelo ID
export const getFieldById = (fieldId) => {
  return getAllFields().find(field => field.id === fieldId);
};

export default lojistaConfigFields; 