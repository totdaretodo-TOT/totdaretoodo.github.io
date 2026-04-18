const tasks = [
  {
    id: "restaurant-opening",
    title: "餐厅开店前准备",
    icon: "🍽️",
    description: "把后场和用餐区准备好，跟着步骤一步一步完成。",
    category: "restaurant",
    steps: [
      {
        instruction: "穿好工作服",
        detail: "戴好帽子，围好围裙，再开始今天的准备。",
        simplify: "戴帽子，围围裙。",
        image: "icon-uniform",
        userImageKey: "restaurant-opening-step-0",
        helpNotFound: ["先看更衣区的挂钩", "看看收纳箱里有没有帽子和围裙", "还是没有就去问值班同事"],
        helpNeed: ["我现在要穿工作服，找不到帽子。", "请帮我看一下围裙放在哪里。"],
        whyItMatters: "先穿好工作服，后面的整理和清洁才符合门店要求。"
      },
      {
        instruction: "擦工作台和备餐台",
        detail: "把台面上的水渍、碎屑和脏东西擦干净。",
        simplify: "把桌子擦干净。",
        image: "icon-wipe",
        userImageKey: "restaurant-opening-step-1",
        helpNotFound: ["先找红色或蓝色抹布", "看看水池边或清洁篮里有没有", "找不到就问同事抹布在哪里"],
        helpNeed: ["我做到擦工作台这一步了，找不到抹布。", "请帮我看一下备餐台哪里还需要擦。"],
        whyItMatters: "工作台干净了，摆工具和处理食材才更安心。"
      },
      {
        instruction: "摆好夹子、纸巾和餐具",
        detail: "把常用工具放回固定位置，方便开店后马上使用。",
        simplify: "把工具放回平时的位置。",
        image: "icon-chopsticks",
        userImageKey: "restaurant-opening-step-2",
        helpNotFound: ["先看工作台左边的小盒子", "再看餐具柜最上层", "还是找不到就问同事餐具放哪"],
        helpNeed: ["我做到摆餐具这一步了，找不到夹子。", "请告诉我纸巾和餐具应该放哪里。"],
        whyItMatters: "工具摆整齐，开店后拿取更快，也不容易手忙脚乱。"
      },
      {
        instruction: "检查常用原料够不够",
        detail: "看一眼纸杯、吸管和常用备品是不是已经补齐。",
        simplify: "看看常用东西是不是都够。",
        image: "icon-eye",
        userImageKey: "restaurant-opening-step-3",
        helpNotFound: ["先看台面下方的储物柜", "再看后面的补货架", "如果缺东西就告诉同事要补货"],
        helpNeed: ["我在检查原料，发现这里可能不够用了。", "请帮我确认一下哪些东西还需要补。"],
        whyItMatters: "开店前先检查，能减少营业时临时缺东西的情况。"
      },
      {
        instruction: "套好垃圾袋",
        detail: "给垃圾桶换上新的垃圾袋，边缘要套稳。",
        simplify: "把新垃圾袋套进垃圾桶。",
        image: "icon-trash",
        userImageKey: "restaurant-opening-step-4",
        helpNotFound: ["先看垃圾桶旁边的抽屉", "再看清洁用品收纳箱", "找不到就问同事垃圾袋在哪里"],
        helpNeed: ["我做到套垃圾袋这一步了，找不到垃圾袋。", "请帮我看一下这个垃圾袋怎么套稳。"],
        whyItMatters: "垃圾袋先准备好，后面清洁和营业都会更顺手。"
      },
      {
        instruction: "最后看一遍准备区",
        detail: "确认台面整齐、工具到位、地面没有明显垃圾。",
        simplify: "再看一眼，都准备好了就行。",
        image: "icon-check",
        userImageKey: "restaurant-opening-step-5",
        helpNotFound: ["先从左到右看一遍台面", "再看地上有没有垃圾", "不确定时请同事帮你再看一次"],
        helpNeed: ["我已经做到最后检查了，请帮我看看还有没有漏掉。", "请确认一下这一区域是不是准备好了。"],
        whyItMatters: "最后检查能让开店前的准备更完整，减少遗漏。"
      }
    ]
  },
  {
    id: "snack-restock",
    title: "零食店补货与整理",
    icon: "🍬",
    description: "把货架、物料和收银前准备整理好，适合营业前执行。",
    category: "snack",
    steps: [
      {
        instruction: "穿好工作服",
        detail: "整理好帽子和围裙，再开始补货和整理。",
        simplify: "穿好工作服。",
        image: "icon-uniform",
        userImageKey: "snack-restock-step-0",
        helpNotFound: ["先看更衣区挂钩", "再看储物柜里有没有", "找不到就问同事工作服放哪"],
        helpNeed: ["我要开始补货了，找不到工作服。", "请帮我看看帽子放在哪里。"],
        whyItMatters: "先整理好自己，再开始补货会更有顺序。"
      },
      {
        instruction: "把货架摆整齐",
        detail: "把歪掉的零食和标签摆正，前排朝外。",
        simplify: "把零食摆整齐。",
        image: "icon-shelf",
        userImageKey: "snack-restock-step-1",
        helpNotFound: ["先看货架最外排有没有空位", "对照旁边一样的商品摆", "不确定时问同事这一类放哪排"],
        helpNeed: ["我在整理货架，不知道这个商品该放哪里。", "请告诉我这一排应该怎么摆。"],
        whyItMatters: "货架整齐了，顾客更容易找到商品，补货也更快。"
      },
      {
        instruction: "补上缺的商品",
        detail: "从补货箱里拿商品，补到空位上。",
        simplify: "把缺的零食补上。",
        image: "icon-box",
        userImageKey: "snack-restock-step-2",
        helpNotFound: ["先看货架下方的补货箱", "再看后仓周转箱", "找不到就问同事补货箱在哪"],
        helpNeed: ["我做到补货这一步了，找不到对应的商品。", "请帮我看一下这个商品应该补到哪一格。"],
        whyItMatters: "补货及时，营业时才不会出现货架空出来的情况。"
      },
      {
        instruction: "检查价格签和标签",
        detail: "看一眼价格签有没有掉、有没有放错行。",
        simplify: "看看价格签对不对。",
        image: "icon-tag",
        userImageKey: "snack-restock-step-3",
        helpNotFound: ["先看商品前面的价格条", "再和旁边同类商品对照", "不确定就请同事帮忙确认"],
        helpNeed: ["我在看价格签，不确定这一排是不是放对了。", "请帮我确认一下这个标签对应哪个商品。"],
        whyItMatters: "价格签放对了，顾客和同事都更容易快速确认商品信息。"
      },
      {
        instruction: "准备购物袋和小票纸",
        detail: "把常用袋子和小票纸放到容易拿的位置。",
        simplify: "把袋子和小票纸准备好。",
        image: "icon-bag",
        userImageKey: "snack-restock-step-4",
        helpNotFound: ["先看收银台下方抽屉", "再看补给盒里有没有", "没有就告诉同事需要补袋子或小票纸"],
        helpNeed: ["我做到准备袋子这一步了，找不到小票纸。", "请帮我看一下袋子应该放在哪里最方便。"],
        whyItMatters: "营业前准备好这些小物料，能减少结账时的中断。"
      },
      {
        instruction: "做一次营业前检查",
        detail: "确认货架整齐、空位补上、常用物料到位。",
        simplify: "最后再检查一遍。",
        image: "icon-check",
        userImageKey: "snack-restock-step-5",
        helpNotFound: ["从左到右看一遍货架", "再看收银台边上的物料", "不确定时让同事帮你再确认一次"],
        helpNeed: ["我已经整理完了，请帮我看看还有哪里没准备好。", "请确认一下现在能不能开始营业。"],
        whyItMatters: "最后检查能把遗漏补上，让营业前状态更稳定。"
      }
    ]
  },
  {
    id: "warehouse-sorting",
    title: "仓库分拣与归位",
    icon: "📦",
    description: "围绕搬运、分类、归位和清洁的标准后场流程。",
    category: "warehouse",
    steps: [
      {
        instruction: "戴好手套",
        detail: "开始搬运前先保护好双手。",
        simplify: "先戴手套。",
        image: "icon-glove",
        userImageKey: "warehouse-sorting-step-0",
        helpNotFound: ["先看工具架", "再看工作台旁边的收纳盒", "找不到就问同事手套放哪"],
        helpNeed: ["我要开始搬货了，找不到手套。", "请帮我看一下这副手套能不能用。"],
        whyItMatters: "先戴手套更安全，搬箱子时也不容易手滑。"
      },
      {
        instruction: "先看今天要分的货",
        detail: "确认今天要处理哪些箱子，再开始搬。",
        simplify: "先看今天要搬什么。",
        image: "icon-write",
        userImageKey: "warehouse-sorting-step-1",
        helpNotFound: ["先看单子夹板", "再看箱子上的标签", "不确定就问同事今天先处理哪一批"],
        helpNeed: ["我在看今天的货，不确定先搬哪一箱。", "请帮我确认一下今天要先处理哪批货。"],
        whyItMatters: "先看清任务，再搬运，能减少来回返工。"
      },
      {
        instruction: "按标签分类摆放",
        detail: "把同一类货放在一起，别混在一起。",
        simplify: "一样的放一起。",
        image: "icon-tag",
        userImageKey: "warehouse-sorting-step-2",
        helpNotFound: ["先看箱子上的颜色或文字标签", "再看对应货区的标识牌", "不确定时问同事这一箱属于哪一区"],
        helpNeed: ["我做到分类这一步了，不知道这箱该放哪。", "请告诉我这个标签应该放到哪个区域。"],
        whyItMatters: "分类摆放清楚，后面找货和盘点都更容易。"
      },
      {
        instruction: "把箱子排整齐",
        detail: "同方向摆放，不歪斜，留出走道。",
        simplify: "把箱子排好。",
        image: "icon-ruler",
        userImageKey: "warehouse-sorting-step-3",
        helpNotFound: ["先对齐地上的线或边缘", "看旁边整齐的箱子照着摆", "不确定时请同事帮你看一眼"],
        helpNeed: ["我在摆箱子，请帮我看看这样放整不整齐。", "请告诉我走道要留多宽。"],
        whyItMatters: "箱子排整齐，仓库更安全，也更方便继续搬运。"
      },
      {
        instruction: "检查有没有放错位置",
        detail: "再看一遍标签和区域，确认没有放混。",
        simplify: "再检查一遍。",
        image: "icon-eye",
        userImageKey: "warehouse-sorting-step-4",
        helpNotFound: ["先看区域牌子", "再对照箱子标签", "不确定时请同事帮你确认"],
        helpNeed: ["我已经摆好了，请帮我确认有没有放错。", "请帮我看一下这一排是不是同一类货。"],
        whyItMatters: "最后检查能减少后面找货时的麻烦。"
      },
      {
        instruction: "收好工具并清理地面",
        detail: "把小车和工具放回原位，再把地面清干净。",
        simplify: "收工具，扫地面。",
        image: "icon-broom",
        userImageKey: "warehouse-sorting-step-5",
        helpNotFound: ["先看工具原来的位置", "再看墙边的工具区", "找不到就请同事告诉你放回哪里"],
        helpNeed: ["我做到收工具这一步了，不知道小车放哪。", "请帮我看一下这里还要不要再扫一遍。"],
        whyItMatters: "收尾做好，下一次开始工作会更顺。"
      }
    ]
  },
  {
    id: "carwash-cleanup",
    title: "洗车后场准备与收尾",
    icon: "🚗",
    description: "围绕洗车前准备、工具补齐和洗后收尾的标准流程。",
    category: "carwash",
    steps: [
      {
        instruction: "穿好防水工作服",
        detail: "穿上工作服和雨鞋，再开始准备工具。",
        simplify: "穿工作服和雨鞋。",
        image: "icon-worker",
        userImageKey: "carwash-cleanup-step-0",
        helpNotFound: ["先看更衣区", "再看储物柜", "找不到就问同事工作服放哪"],
        helpNeed: ["我要开始洗车前准备了，找不到雨鞋。", "请帮我看看工作服放在哪里。"],
        whyItMatters: "先准备好自己，做湿区工作会更安全。"
      },
      {
        instruction: "把水管和清洁工具摆好",
        detail: "把水管、海绵、洗车液放到方便拿的位置。",
        simplify: "把工具先摆好。",
        image: "icon-hose",
        userImageKey: "carwash-cleanup-step-1",
        helpNotFound: ["先看工具架", "再看水槽旁边的收纳区", "找不到就问同事水管和海绵在哪"],
        helpNeed: ["我做到摆工具这一步了，找不到海绵。", "请帮我看一下水管应该放哪边。"],
        whyItMatters: "工具先摆好，开始工作时不会来回找东西。"
      },
      {
        instruction: "检查洗车液和毛巾够不够",
        detail: "看一眼常用耗材是不是已经补齐。",
        simplify: "看看洗车液和毛巾够不够。",
        image: "icon-bottle",
        userImageKey: "carwash-cleanup-step-2",
        helpNotFound: ["先看补给架", "再看储物柜下层", "没有就告诉同事要补货"],
        helpNeed: ["我在检查耗材，发现毛巾可能不够。", "请帮我确认一下洗车液还有没有备用。"],
        whyItMatters: "提前检查耗材，洗车中途才不会突然停下来。"
      },
      {
        instruction: "把脏毛巾和空瓶分类放好",
        detail: "用过的毛巾和空瓶不要混在工作区。",
        simplify: "把用过的东西分开放。",
        image: "icon-bucket",
        userImageKey: "carwash-cleanup-step-3",
        helpNotFound: ["先看脏毛巾桶", "再看空瓶回收箱", "不确定时问同事应该丢哪边"],
        helpNeed: ["我做到分类收尾这一步了，不知道空瓶放哪。", "请帮我确认一下脏毛巾应该放进哪个桶。"],
        whyItMatters: "分类收好，工作区才不会越做越乱。"
      },
      {
        instruction: "冲一下地面并把积水推开",
        detail: "把明显污水冲掉，保持走道不打滑。",
        simplify: "把地面冲干净，推开积水。",
        image: "icon-waterdrop",
        userImageKey: "carwash-cleanup-step-4",
        helpNotFound: ["先看排水口位置", "从里往外推水", "不确定时请同事告诉你先清哪边"],
        helpNeed: ["我在清地面，请帮我看看积水要往哪边推。", "请确认一下这里是不是还要再冲一遍。"],
        whyItMatters: "地面保持干净和不打滑，后面继续作业更安全。"
      },
      {
        instruction: "收好工具，准备下一辆车",
        detail: "把水管卷好、毛巾归位，工作区恢复整齐。",
        simplify: "收好工具，准备下一次使用。",
        image: "icon-check",
        userImageKey: "carwash-cleanup-step-5",
        helpNotFound: ["先把水管卷回挂钩", "再把毛巾放回干净区", "不确定时问同事工具归位位置"],
        helpNeed: ["我已经做到最后一步了，请帮我看看工具是不是都收好了。", "请确认一下这里能不能开始接下一辆车。"],
        whyItMatters: "收尾整齐，下一次开始工作会更快更稳。"
      }
    ]
  }
];

const categoryNames = {
  restaurant: "餐厅",
  snack: "零食",
  warehouse: "仓库",
  carwash: "洗车"
};
