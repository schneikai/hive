Dummy::Application.routes.draw do
  hive_for :users
  root 'application#index'
end
