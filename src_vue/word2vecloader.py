#from pymagnitude import Magnitude



class Word2VecLoader:

    def __init__(self):
        #self.model_gensima = Magnitude("c:\\linux\\test.magnitude")
        #self.model_gensimi = Magnitude("c:\\linux\\auspolI2.magnitude")
        #self.model_gensim = Magnitude("c:\\linux\\covidI.magnitude")
    
    def similarity (self, tag1, tag2):
        return self.model_gensim.similarity(tag1, tag2)
    
    
  
    def egoGraph (self, keyword, EN, K, time_ids):
        print("in ego kw, EN, K", keyword, EN, K)
        # 1 Extrac a list N = [w1, ...] of N nearest hashtag neighbours for the target ego vector
        # find top 100 for keyword
        topN = []
        counter = EN
        # topN, vecs_tags = simTopList(EN, hashTagSet, "#"+keyword)
        topNTmp = self.model_gensim.most_similar("#"+keyword, topn=EN*10)
        for el in topNTmp:
            if el[0][:1] == "#":
                topN.append(el[0])
                counter -= 1
            if counter == 0:
                break
        #print("in egoGraph topN", topN)
        # 2 Compute delta list D = [d1, ...] for each wi in N where di = w-wi
        deltaN = []
        for index in range(len(topN)):
            deltaTagTmp = self.model_gensim.most_similar(positive=["#"+keyword], negative=[topN[index]], topn=10)
            for index in range(len(deltaTagTmp)):
                deltaTag = deltaTagTmp[index]
                if deltaTag[0][:1] == "#":
                #print(top100[index], deltaTag)
                    deltaN.append(deltaTag[0])
                    #delta_vecs = self.model_gensim[deltaTag[0]]
                    break
                if index == len(deltaTagTmp)-1:
                    deltaN.append(deltaTagTmp[index][0])
                    #delta_vecs = self.model_gensim[deltaTagTmp[index][0]]
        #print("egoGraph 2 done")
        # 3. compute a list NStrich = wstrich1, ... such tat w,strich 
        topNStrich = []
        for index in range(EN):
            topNStrich.append((topN[index], deltaN[index]))
        #print("egoGraph 3 done")
        # 4 construct V from the list of anti-Edges E with the following recurrent procedure
        # V = V union (wi, wiStrich):wi E N, wiStrich E N)
        # thus only add Vertices if wi AND their antipair belong to N
        V = set()
        vertices = []
        for pair in topNStrich:
            if pair[1] in topN:
                if pair[0][:1] == "#" and pair[1][:1] == "#":
                    #print("in 1", pair[1])
                    V.add(pair[0])
                    V.add(pair[1])
        for v in V:
            vertices.append([v, {"time_ids": [1], "weights": [float(self.model_gensim.similarity(v, "#"+keyword))], "target_text": v } ])
        #print("egoGraph 4 done")
        # 5 construct set of Edges as follow
        # for each wiin N get top K neighbours
        E = set()
        edges = []
        NStrich2= []
        for index in range(EN):
            deltaTagTmp = self.model_gensim.most_similar(topN[index], topn=K)
            NStrich2Tmp = []
            for index in range(len(deltaTagTmp)):
                deltaTag = deltaTagTmp[index]
                if deltaTag[0][:1] == "#":
                    #print(top100[index], deltaTag)
                    NStrich2Tmp.append(deltaTag[0])
                if index == len(deltaTagTmp)-1 and len(NStrich2Tmp)==0:
                    NStrich2Tmp.append(deltaTagTmp[index][0])
            NStrich2.append(NStrich2Tmp)
        for index in range(EN):
            for word in NStrich2[index]:
                    if word in V and topN[index] in V and word not in deltaN:
                        E.add((word, topN[index]))
        singletons = set()
        for e in E:
            edges.append((e[0], e[1], {"weight": float(self.model_gensim.similarity(e[0], e[1])), "weights": [float(self.model_gensim.similarity(e[0], e[1]))], 
                                      "time_ids": [1], "source_text": e[0], "target_text": e[1]}))
            if e[0] not in V:
                singletons.add(e[0])
            if e[1] not in V:
                singletons.add(e[1])
        #print("in word2vec edges ", edges)
        #print("in w2v knoten", vertices)
        #print("in w2v singletons", list(singletons))
        


        return vertices, edges, singletons