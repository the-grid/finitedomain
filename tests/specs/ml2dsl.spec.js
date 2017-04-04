import expect from '../fixtures/mocha_proxy.fixt';
import preSolver from '../../src/runner';

function FakeSolver(solution) {
  function FS() {
    console.log('Invoked mock Solver, should return:', [solution]);
    this.solutions = [solution];
  }
  FS.prototype.imp = function() { return this; };
  FS.prototype.solve = _ => [solution];

  if (new.target) return FS;
  //if (this instanceof FakeSolver) return FS;
  return new FakeSolver(solution);
}

describe('specs/ml2dsl.spec', function() {

  describe('options', function() {
    // this is mostly to extend test coverage in the debugging area of ml2dsl (but still, that should work too)

    function test(debugDsl, hashNames, indexNames, groupedConstraints) {

      describe(`debugDsl:${debugDsl}, hashNames:${hashNames}, indexNames:${indexNames}, groupedConstraints:${groupedConstraints}`, function() {
        let options = {
          debugDsl,
          hashNames,
          indexNames,
          groupedConstraints,
        };

        //if (debugDsl !== true || hashNames !== false || indexNames !== false || groupedConstraints !== true) return;

        it('should various unsolveable constraints', function() {
          expect(_ => preSolver(`
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
          `, FakeSolver({A: 0, D: 0, E: 1}), options)).not.to.throw();
        });
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
