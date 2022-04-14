export default {
    json: `?start: value

?value: object
      | array
      | STRING
      | NUMBER             -> number
      | "true"             -> true
      | "false"            -> false
      | "null"             -> null

array  : "[" [value ("," value)*] "]"
object : "{" [pair ("," pair)*] "}"
pair   : STRING ":" value

STRING : ESCAPED_STRING
NUMBER : SIGNED_NUMBER

%import common.ESCAPED_STRING
%import common.SIGNED_NUMBER
%import common.WS

%ignore WS`,
};