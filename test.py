d = {
    "a": 1,
    "c": 10,
    "b": 4,
    "d": 2
}
vals = list(d.items())

for i in range(len(vals)):
    for j in range(i+1,len(vals)):
        if vals[i][1] > vals[j][1]:
            vals[i], vals[j] = vals[j], vals[i]
d = dict(vals)
print(d)







def is_prime(num):
    if(num<=1):
        return False
    else :
        for x in range(2,num):
            if(num%x==0):
                return False
            else:
                continue
        return True

def is_semiPrime(num):
    if num<=1:
        return False
    else:
        for x in range(2,num):
            if(num%x==0):
                if(is_prime(x) and is_prime(num//x) and x != num//x):
                    return True
                
        return False
    
print(is_semiPrime(5))
print(is_semiPrime(15))
print(is_semiPrime(20))
print(is_semiPrime(-20))

