import expect from '../../fixtures/mocha_proxy.fixt';
import Solver from '../../../src/solver';

function FakeSolver() {
  let solution;
  function FS() {
    console.log('Invoked mock Solver');
  }
  FS.prototype.imp = function(dsl) {
    // make sure all input vars get their initial domains output
    // (we dont care about the actual solution here. we just want to make sure the system properly flushes the results)
    let obj = {};
    dsl.replace(/^: (.*?) (\[.*?\])/gm, function(a, b, c) {
      obj[b] = JSON.parse(c);
    });
    this.solutions = solution = [obj];

    return this;
  };
  FS.prototype.solve = _ => solution;

  if (new.target) return FS;
  //if (this instanceof FakeSolver) return FS;
  return new FakeSolver();
}

describe('specs/ml2dsl.spec', function() {

  //let n = 0;
  describe('options', function() {
    // this is mostly to extend test coverage in the debugging area of ml2dsl (but still, that should work too)

    function test(debugDsl, hashNames, indexNames, groupedConstraints) {

      //if (n++) return;
      //debugDsl=true,
      //hashNames=false,
      //indexNames=true,
      //groupedConstraints=true

      let options = {
        debugDsl,
        hashNames,
        indexNames,
        groupedConstraints,
        Solver: FakeSolver(hashNames ? {_0_: 0, $2$: 0, $3$: 1} : {A: 0, D: 0, E: 1}),
      };

      it(`debugDsl:${debugDsl}, hashNames:${hashNames}, indexNames:${indexNames}, groupedConstraints:${groupedConstraints}; should various unsolveable constraints`, function() {
        expect(_ => Solver.pre(`
          : A [0 10]
          : B 5 alias(C)
          : D, E [0 10]
          A > 5
          D != E
          @custom noleaf D E

          # the uncuttable plus tries to proc a path where args are solved
          : F, G [0 100]
          : H 50
          F = G + H
          @custom noleaf F G H
          : I, K [0 100]
          : J 50
          I = J + K
          @custom noleaf I J K
          : L, M [0 100]
          : N 50
          N = L + M
          @custom noleaf L M N

          : a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z [0 10]
          : aa,bb,cc,dd,ee,ff,gg,hh,ii,jj,kk,ll,mm,nn,oo,pp,qq,rr,ss,tt,uu,vv,ww,xx,yy,zz [0 10]
          : aaa,bbb,ccc,ddd,eee,fff,ggg,hhh,iii,jjj,kkk,lll,mmm,nnn,ooo,ppp,qqq,rrr [0 10]
          @custom noleaf a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z
          a == b
          c != d
          e < f
          g <= h
          i = j ==? k
          l = m !=? n
          o = p <? q
          r = s <=? t
          u = all?(v w)
          x = all?(y z aa)
          bb = nall?(cc dd ee)
          ff = none?(gg hh ii)
          jj = sum(kk ll mm)
          nn = product(oo pp qq)
          distinct(rr ss tt)
          uu = vv + ww
          xx = yy - zz
          aaa = bbb * ccc
          ddd = eee / fff
          hhh & iii
          kkk | lll
          nnn !& ooo
          @custom noleaf aa,bb,cc,dd,ee,ff,gg,hh,ii,jj,kk,ll,mm,nn,oo,pp,qq,rr,ss,tt,uu,vv,ww,xx,yy,zz
          @custom noleaf aaa,bbb,ccc,ddd,eee,fff,ggg,hhh,iii,jj,kkk,lll,mmm,nnn,ooo,ppp,qqq,rrr
        `, options, {log: 1})).not.to.throw();
      });
    }

    [undefined, false, true].forEach(debugDsl => {
      [undefined, false, true].forEach(hashNames => {
        [undefined, false, true].forEach(indexNames => {
          [undefined, false, true].forEach(groupedConstraints => {
            test(debugDsl, hashNames, indexNames, groupedConstraints);
          });
        });
      });
    });
  });
});
